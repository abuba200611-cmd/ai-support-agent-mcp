// Agent Server — يربط بين:
//  1) عميل MCP (يتصل بـ mcp-server ويجيب قائمة الأدوات ويستدعيها)
//  2) LLM Provider (Claude أو Gemini — انظر providers.js) عبر حلقة tool-calling
//  3) واجهة HTTP بسيطة (/chat) يستدعيها نموذج الويب أو n8n عبر webhook

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAgentRunner } from "./providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// نحمّل .env بمسار صريح (مو بالاعتماد على process.cwd()) عشان يشتغل بغض النظر
// من أي مجلد تُشغَّل منه العملية
dotenv.config({ path: path.join(__dirname, "..", ".env") });
const MCP_SERVER_PATH = path.join(__dirname, "..", "mcp-server", "index.js");

// PROVIDER=gemini (مجاني، افتراضي) أو PROVIDER=anthropic (يحتاج رصيد مدفوع)
const PROVIDER = (process.env.PROVIDER || "gemini").toLowerCase();

// --- تشغيل عميل MCP متصل بسيرفر الأدوات ---
const transport = new StdioClientTransport({
  command: process.execPath, // node
  args: [MCP_SERVER_PATH],
});
const mcpClient = new Client({ name: "agent-server", version: "1.0.0" }, { capabilities: {} });
await mcpClient.connect(transport);

const { tools: mcpTools } = await mcpClient.listTools();
console.log(`[mcp] connected — ${mcpTools.length} tool(s): ${mcpTools.map(t => t.name).join(", ")}`);
console.log(`[provider] using ${PROVIDER}`);

const SYSTEM_PROMPT = `أنت وكيل دعم عملاء لمتجر إلكتروني سعودي.
- جاوب دائمًا بالعربية، بإيجاز ووضوح.
- لا تخمّن معلومات (حالة طلب، سعر، شحن) — استخدم الأدوات المتاحة للحصول عليها دائمًا.
- إذا ما لقيت معلومة، اعتذر بأدب واطلب توضيح.`;

const runAgent = createAgentRunner({ provider: PROVIDER, mcpClient, mcpTools, systemPrompt: SYSTEM_PROMPT });

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

app.get("/health", (_req, res) => res.json({ ok: true, provider: PROVIDER }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[agent-server] listening on http://localhost:${PORT}`));
