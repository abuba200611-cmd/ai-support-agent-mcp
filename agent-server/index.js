// Agent Server — يربط بين:
//  1) عميل MCP (يتصل بـ mcp-server ويجيب قائمة الأدوات ويستدعيها)
//  2) Claude API (tool calling loop)
//  3) واجهة HTTP بسيطة (/chat) يستدعيها نموذج الويب أو n8n عبر webhook

import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_PATH = path.join(__dirname, "..", "mcp-server", "index.js");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- تشغيل عميل MCP متصل بسيرفر الأدوات ---
const transport = new StdioClientTransport({
  command: process.execPath, // node
  args: [MCP_SERVER_PATH],
});
const mcpClient = new Client({ name: "agent-server", version: "1.0.0" }, { capabilities: {} });
await mcpClient.connect(transport);

const { tools: mcpTools } = await mcpClient.listTools();
console.log(`[mcp] connected — ${mcpTools.length} tool(s): ${mcpTools.map(t => t.name).join(", ")}`);

// تحويل تعريف أدوات MCP لصيغة أدوات Claude
const claudeTools = mcpTools.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema,
}));

const SYSTEM_PROMPT = `أنت وكيل دعم عملاء لمتجر إلكتروني سعودي.
- جاوب دائمًا بالعربية، بإيجاز ووضوح.
- لا تخمّن معلومات (حالة طلب، سعر، شحن) — استخدم الأدوات المتاحة للحصول عليها دائمًا.
- إذا ما لقيت معلومة، اعتذر بأدب واطلب توضيح.`;

async function runAgent(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  // حلقة tool-calling: نكرر لين Claude يرجع رد نهائي بدون طلب أداة
  for (let step = 0; step < 5; step++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: claudeTools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    }

    const toolResults = [];
    for (const toolUse of toolUses) {
      console.log(`[tool_call] ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
      const result = await mcpClient.callTool({
        name: toolUse.name,
        arguments: toolUse.input,
      });
      const text = result.content?.[0]?.text ?? "";
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: text,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "تعذّر إكمال الطلب، حاول صياغة سؤالك بشكل مختلف.";
}

// --- HTTP API ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "web")));

app.post("/chat", async (req, res) => {
  try {
    const message = (req.body?.message || "").toString().trim();
    if (!message) return res.status(400).json({ error: "message is required" });
    const reply = await runAgent(message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error", detail: String(err?.message || err) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[agent-server] listening on http://localhost:${PORT}`));
