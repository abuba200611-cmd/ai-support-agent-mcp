// بيانات وهمية (mock) تمثل قاعدة بيانات متجر إلكتروني بسيط
// في مشروع حقيقي هذي تُستبدل باتصال فعلي بقاعدة بيانات المتجر (سلة، شوبيفاي، ...)

export const ORDERS = {
  "1001": { status: "تم الشحن", city: "الرياض", eta: "خلال يومين", items: ["سماعة لاسلكية"] },
  "1002": { status: "قيد التجهيز", city: "مكة", eta: "خلال 4 أيام", items: ["ساعة ذكية", "شاحن سريع"] },
  "1003": { status: "تم التوصيل", city: "الدمام", eta: "تم التسليم بالفعل", items: ["حقيبة ظهر"] },
};

export const PRODUCTS = [
  { id: "p1", name: "سماعة لاسلكية X100", price: 149, stock: 23, category: "إلكترونيات" },
  { id: "p2", name: "ساعة ذكية Fit2", price: 299, stock: 8, category: "إلكترونيات" },
  { id: "p3", name: "حقيبة ظهر سفر", price: 89, stock: 0, category: "حقائب" },
  { id: "p4", name: "شاحن سريع 65 واط", price: 59, stock: 40, category: "إلكترونيات" },
];

export const SHIPPING = {
  "الرياض": { days: "1-2", cost: 15 },
  "مكة": { days: "2-4", cost: 15 },
  "الدمام": { days: "2-3", cost: 20 },
  "default": { days: "3-6", cost: 25 },
};
