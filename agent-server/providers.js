// طبقة تجريد بسيطة تسمح بتبديل مزوّد الذكاء الاصطناعي (LLM Provider) بدون تغيير باقي الكود.
// حاليًا مدعوم: Anthropic Claude (مدفوع، أفضل جودة) و Google Gemini (مجاني بالكامل عبر AI Studio).

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, Type } from "@google/genai";

// ---------- Anthropic (Claude) ----------
function makeAnthropicRunner({ apiKey, mcpClient, mcpTools, systemPrompt }) {
  const anthropic = new Anthropic({ apiKey });
  const tools = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  return async function run(userMessage) {
    const messages = [{ role: "user", content: userMessage }];
    for (let step = 0; step < 5; step++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      });
      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      if (toolUses.length === 0) {
        return response.content.find((b) => b.type === "text")?.text ?? "";
      }

      const toolResults = [];
      for (const toolUse of toolUses) {
        console.log(`[tool_call] ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
        const result = await mcpClient.callTool({ name: toolUse.name, arguments: toolUse.input });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.content?.[0]?.text ?? "",
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
    return "تعذّر إكمال الطلب.";
  };
}

// ---------- Google Gemini (مجاني) — عبر الحزمة الرسمية الجديدة @google/genai ----------
// يحوّل JSON Schema العادي (اللي يستخدمه MCP) لصيغة Gemini (Type بأحرف كبيرة)
function toGeminiSchema(schema) {
  if (!schema) return undefined;
  const typeMap = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
    object: Type.OBJECT,
  };
  const out = { type: typeMap[schema.type] ?? Type.STRING };
  if (schema.description) out.description = schema.description;
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, toGeminiSchema(v)])
    );
  }
  if (schema.required) out.required = schema.required;
  if (schema.items) out.items = toGeminiSchema(schema.items);
  return out;
}

function makeGeminiRunner({ apiKey, mcpClient, mcpTools, systemPrompt }) {
  const ai = new GoogleGenAI({ apiKey });
  const functionDeclarations = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: toGeminiSchema(t.inputSchema),
  }));

  const chat = ai.chats.create({
    model: "gemini-3.6-flash",
    config: { systemInstruction: systemPrompt, tools: [{ functionDeclarations }] },
  });

  return async function run(userMessage) {
    let response = await chat.sendMessage({ message: userMessage });

    for (let step = 0; step < 5; step++) {
      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        return response.text ?? "";
      }

      const parts = [];
      for (const call of calls) {
        console.log(`[tool_call] ${call.name}(${JSON.stringify(call.args)})`);
        const toolResult = await mcpClient.callTool({ name: call.name, arguments: call.args });
        let parsed;
        try {
          parsed = JSON.parse(toolResult.content?.[0]?.text ?? "{}");
        } catch {
          parsed = toolResult.content?.[0]?.text ?? "";
        }
        // حقل response عند Gemini لازم يكون object — نغلّف أي مصفوفة/نص بكائن
        const responseObj = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : { results: parsed };
        parts.push({ functionResponse: { name: call.name, response: responseObj } });
      }
      response = await chat.sendMessage({ message: parts });
    }
    return "تعذّر إكمال الطلب.";
  };
}

export function createAgentRunner({ provider, mcpClient, mcpTools, systemPrompt }) {
  if (provider === "gemini") {
    return makeGeminiRunner({ apiKey: process.env.GEMINI_API_KEY, mcpClient, mcpTools, systemPrompt });
  }
  return makeAnthropicRunner({ apiKey: process.env.ANTHROPIC_API_KEY, mcpClient, mcpTools, systemPrompt });
}
