# 🤖 وكيل دعم عملاء بالذكاء الاصطناعي — MCP + n8n + VPS

🔗 **تجربة حية:** [ai-support-agent-mcp.onrender.com](https://ai-support-agent-mcp.onrender.com)
(منشور مجانًا بالكامل على Render — أول طلب قد ياخذ ~30-50 ثانية لأن الخطة المجانية تنام بعد عدم النشاط)

مشروع بورتفوليو صغير مبني خصيصًا ليغطي متطلبات وظيفة **AI Agents & Automation Engineer**:
بناء وكيل AI (Agent) باستخدام **بروتوكول MCP** لاستدعاء الأدوات (Tool Calling)، مربوط بأتمتة
**n8n** عبر **Webhook/API**، ومنشور فعليًا على **VPS**، مع **CLI** لاختباره من الطرفية.

## الفكرة

وكيل دعم عملاء لمتجر إلكتروني وهمي، يقدر يجاوب على 3 أنواع أسئلة باستخدام أدوات حقيقية
(مش تخمين من النموذج):

| السؤال | الأداة (MCP Tool) |
|---|---|
| "وش حالة طلبي رقم 1001؟" | `check_order_status` |
| "عندكم ساعات ذكية؟" | `search_products` |
| "كم مدة التوصيل لجدة؟" | `get_shipping_info` |

## البنية المعمارية

```
┌─────────────┐     ┌──────────┐     ┌──────────────────┐     ┌───────────────┐
│ نموذج ويب    │────▶│ n8n      │────▶│ agent-server      │────▶│ Claude API    │
│ (web/)      │     │ Webhook  │     │ (Express + MCP    │     │ (tool calling)│
└─────────────┘     └──────────┘     │  client)          │     └───────┬───────┘
                                      └─────────┬─────────┘             │
┌─────────────┐                                │                       │
│ CLI (cli/)  │────────────────────────────────┘             استدعاء أداة عند الحاجة
└─────────────┘                                │                       │
                                      ┌─────────▼─────────┐             │
                                      │ mcp-server         │◀────────────┘
                                      │ (MCP tools: orders,│
                                      │  products, shipping)│
                                      └────────────────────┘
```

- **`mcp-server/`** — سيرفر MCP حقيقي (بروتوكول Model Context Protocol) يعرّض 3 أدوات ببيانات وهمية.
- **`agent-server/`** — يتصل كعميل MCP بالسيرفر أعلاه، ويشغّل حلقة tool-calling مع Claude API، ويعرض API عبر HTTP (`/chat`).
- **`web/`** — نموذج ويب بسيط (HTML/JS) للمحادثة مع الوكيل.
- **`cli/`** — سكربت Node.js لاختبار الوكيل مباشرة من الطرفية.
- **`n8n/`** — Workflow جاهز للاستيراد: Webhook → استدعاء الوكيل → رد.
- **`deploy/`** — Docker + docker-compose + دليل نشر كامل على VPS من الصفر.

## التشغيل محليًا

يدعم المشروع مزوّدين للذكاء الاصطناعي (قابل للتبديل عبر `PROVIDER` في `.env`):

- **`gemini`** (الافتراضي) — **مجاني بالكامل**، مفتاح من [aistudio.google.com/apikey](https://aistudio.google.com/apikey) بدون بطاقة بنكية
- **`anthropic`** — جودة أعلى، يحتاج رصيد مدفوع من [console.anthropic.com](https://console.anthropic.com/settings/keys)

```bash
npm install
cp .env.example .env
# حط GEMINI_API_KEY (مجاني) أو ANTHROPIC_API_KEY داخل .env

npm start          # يشغّل agent-server (ويشغّل mcp-server تلقائيًا كـ subprocess)
```

افتح `http://localhost:3000` للنموذج، أو من طرفية ثانية:

```bash
npm run chat -- "وش حالة طلبي رقم 1001؟"
```

## تشغيل n8n محليًا (اختياري)

```bash
docker compose -f deploy/docker-compose.yml up -d
```

افتح `http://localhost:5678`، استورد `n8n/support-agent-webhook.json`، فعّله،
وبعدها ابعث POST لـ `http://localhost:5678/webhook/support-chat` بـ body:
`{"message": "عندكم سماعات؟"}`

## النشر

- **الحالي (مجاني، بدون بطاقة):** منشور على [Render](https://render.com) — رابط حي أعلاه. يوضّح القدرة
  على نشر تطبيق Node حقيقي متصل بـMCP على الإنترنت، مع بيئة إنتاج فعلية (متغيرات بيئة، build/start commands).
- **البديل الموثّق (VPS كامل):** راجع [`deploy/VPS-SETUP.md`](deploy/VPS-SETUP.md) — دليل خطوة بخطوة
  كامل لنشر المشروع بـDocker على VPS حقيقي (Hetzner/DigitalOcean) مع تحكم كامل بالسيرفر (root access،
  firewall، Nginx، SSL) — جاهز للتنفيذ فور توفر بطاقة بنكية للتحقق.

## لماذا هذا المشروع يغطي متطلبات الوظيفة

- ✅ **AI Agents & تصميم** — `agent-server` يدير حلقة قرار/استدعاء أداة/رد كاملة
- ✅ **Agent Skills & Tool Calling** — 3 أدوات معرّفة بمخطط JSON Schema
- ✅ **بروتوكول MCP** — استخدام فعلي لـ `@modelcontextprotocol/sdk` (server + client)
- ✅ **أتمتة العمليات بـn8n** — workflow حقيقي (Webhook → HTTP Request → Respond)
- ✅ **التكامل عبر APIs وWebhooks** — REST endpoint + n8n webhook
- ✅ **إدارة VPS وHosting** — دليل نشر كامل بـDocker على سيرفر حقيقي
- ✅ **التعامل مع CLI/Terminal** — `cli/chat.js`

## ملاحظة

البيانات (طلبات/منتجات/شحن) في `mcp-server/data.js` وهمية لأغراض العرض — في مشروع حقيقي
تُستبدل باتصال فعلي بقاعدة بيانات المتجر (مثل سلة أو شوبيفاي عبر API).
