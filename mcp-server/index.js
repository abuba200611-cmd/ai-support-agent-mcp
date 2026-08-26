// MCP Server — يعرّض أدوات (tools) الوكيل عبر بروتوكول Model Context Protocol (MCP)
// يشتغل عبر stdio، ويستدعيه agent-server كعميل MCP (MCP client)

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ORDERS, PRODUCTS, SHIPPING } from "./data.js";

const server = new Server(
  { name: "store-support-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: "check_order_status",
    description: "يرجّع حالة طلب معيّن باستخدام رقم الطلب (order id)",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "رقم الطلب، مثال: 1001" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "search_products",
    description: "يبحث في كتالوج المنتجات بالاسم أو الفئة، ويرجّع السعر والمخزون",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "كلمة البحث، مثال: سماعة" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_shipping_info",
    description: "يرجّع مدة وتكلفة الشحن المتوقعة لمدينة معيّنة",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "اسم المدينة، مثال: الرياض" },
      },
      required: ["city"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "check_order_status") {
    const order = ORDERS[args.order_id];
    const result = order
      ? { found: true, ...order }
      : { found: false, message: "لا يوجد طلب بهذا الرقم" };
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  if (name === "search_products") {
    const q = (args.query || "").trim();
    const matches = PRODUCTS.filter(
      (p) => p.name.includes(q) || p.category.includes(q)
    );
    return { content: [{ type: "text", text: JSON.stringify(matches) }] };
  }

  if (name === "get_shipping_info") {
    const info = SHIPPING[args.city] || SHIPPING.default;
    return { content: [{ type: "text", text: JSON.stringify(info) }] };
  }

  return {
    content: [{ type: "text", text: `أداة غير معروفة: ${name}` }],
    isError: true,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
