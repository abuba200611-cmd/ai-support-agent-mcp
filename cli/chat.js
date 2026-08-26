#!/usr/bin/env node
// CLI لاختبار/التعامل مع الوكيل مباشرة من الطرفية (Terminal)
// استخدام:
//   node cli/chat.js "وش حالة طلبي رقم 1001؟"
//   node cli/chat.js   -> يفتح جلسة محادثة تفاعلية

import readline from "node:readline";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:3000/chat";

async function ask(message) {
  const res = await fetch(AGENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "request failed");
  return data.reply;
}

const argMessage = process.argv.slice(2).join(" ").trim();

if (argMessage) {
  const reply = await ask(argMessage);
  console.log(reply);
  process.exit(0);
}

console.log("جلسة محادثة مع وكيل الدعم (اكتب exit للخروج)\n");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "أنت> " });
rl.prompt();
rl.on("line", async (line) => {
  const text = line.trim();
  if (text === "exit") return rl.close();
  try {
    const reply = await ask(text);
    console.log("الوكيل> " + reply + "\n");
  } catch (err) {
    console.error("خطأ: " + err.message);
  }
  rl.prompt();
});
