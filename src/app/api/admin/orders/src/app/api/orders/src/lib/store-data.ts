export type Locale = "ar" | "en";
export type CategoryId = "gaming" | "gift" | "subs";
export type Localized = { ar: string; en: string };

export type ProductPackage = {
  label: Localized;
  price: number;
};

export type Product = {
  id: number;
  category: CategoryId;
  image: string;
  name: Localized;
  description: Localized;
  delivery: Localized;
  requiresPlayerId: boolean;
  packages: ProductPackage[];
};

const pack = (ar: string, price: number, en = ar): ProductPackage => ({ label: { ar, en }, price });

export const categories: { id: CategoryId; icon: string; name: Localized }[] = [
  { id: "gaming", icon: "🎮", name: { ar: "ألعاب", en: "Gaming" } },
  { id: "gift", icon: "🎁", name: { ar: "بطاقات هدايا", en: "Gift Cards" } },
  { id: "subs", icon: "📺", name: { ar: "اشتراكات", en: "Subscriptions" } },
];

export const products: Product[] = [
  {
    id: 1, category: "gaming", image: "/images/p1.jpg",
    name: { ar: "شحن PUBG Mobile UC", en: "PUBG Mobile UC" },
    description: { ar: "شحن مباشر بالـ Player ID", en: "Direct top-up via Player ID" },
    delivery: { ar: "5–15 دقيقة", en: "5–15 min" }, requiresPlayerId: true,
    packages: [
      pack("30 UC", 30), pack("60 UC", 55), pack("325 UC", 255), pack("660 UC", 495),
      pack("1,800 UC", 1250), pack("3,850 UC", 2485), pack("8,100 UC", 4900),
      pack("16,200 UC", 9750), pack("24,300 UC", 14600), pack("32,400 UC", 19400),
      pack("40,500 UC", 24200), pack("48,600 UC", 28985),
    ],
  },
  {
    id: 11, category: "gaming", image: "/images/p11.jpg",
    name: { ar: "ببجي نيو ستيت (NC)", en: "PUBG New State (NC)" },
    description: { ar: "شحن مباشر بالـ Player ID", en: "Direct top-up via Player ID" },
    delivery: { ar: "5–15 دقيقة", en: "5–15 min" }, requiresPlayerId: true,
    packages: [
      pack("300 NC", 75),
      pack("1,500 NC + 80 NC مجاناً", 325, "1,500 NC + 80 NC free"),
      pack("3,600 NC + 250 NC مجاناً", 780, "3,600 NC + 250 NC free"),
      pack("9,300 NC + 930 NC مجاناً", 2000, "9,300 NC + 930 NC free"),
      pack("15,000 NC + 1,800 NC مجاناً", 3200, "15,000 NC + 1,800 NC free"),
      pack("30,000 NC + 5,000 NC مجاناً", 6370, "30,000 NC + 5,000 NC free"),
    ],
  },
  {
    id: 2, category: "gift", image: "/images/p2.jpg",
    name: { ar: "بطاقة Steam (ريال سعودي 🇸🇦)", en: "Steam Wallet (SAR 🇸🇦)" },
    description: { ar: "كود رقمي بالبريد/واتساب", en: "Digital code by email/WhatsApp" },
    delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false,
    packages: [pack("20 SAR", 360), pack("50 SAR", 890), pack("100 SAR", 1780), pack("200 SAR", 3550)],
  },
  {
    id: 7, category: "gift", image: "/images/p7.jpg",
    name: { ar: "بطاقة PlayStation", en: "PlayStation" },
    description: { ar: "كود رقمي", en: "Digital code" },
    delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false,
    packages: [
      pack("$5", 330), pack("$10", 735), pack("$20", 1445), pack("$50", 3645),
      pack("$10 (السعر الثاني)", 675, "$10 (2nd price)"),
      pack("$20 (السعر الثاني)", 1330, "$20 (2nd price)"), pack("$100", 7235),
    ],
  },
  {
    id: 8, category: "gift", image: "/images/p8.jpg",
    name: { ar: "Xbox – بطاقات و Game Pass", en: "Xbox Cards & Game Pass" },
    description: { ar: "كود رقمي", en: "Digital code" },
    delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false,
    packages: [
      pack("50 ريال سعودي", 825, "SAR 50"), pack("100 ريال سعودي", 1645, "SAR 100"),
      pack("200 ريال سعودي", 3295, "SAR 200"), pack("300 ريال سعودي", 4945, "SAR 300"),
      pack("Game Pass 3 شهور", 1875, "Game Pass 3 months"),
      pack("Game Pass 6 شهور", 3750, "Game Pass 6 months"),
      pack("Ultimate شهر", 880, "Ultimate 1 month"),
    ],
  },
  {
    id: 9, category: "subs", image: "/images/p9.jpg",
    name: { ar: "OSN Plus", en: "OSN Plus" },
    description: { ar: "كود رقمي", en: "Digital code" },
    delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false,
    packages: [
      pack("شهر بإعلانات", 90, "1 month with ads"), pack("سنة بإعلانات", 880, "1 year with ads"),
      pack("Standard شهر", 145, "Standard 1 month"), pack("Standard سنة", 1465, "Standard 1 year"),
      pack("Premium شهر", 175, "Premium 1 month"), pack("Premium سنة", 1955, "Premium 1 year"),
    ],
  },
  {
    id: 10, category: "subs", image: "/images/p10.jpg",
    name: { ar: "Netflix", en: "Netflix" },
    description: { ar: "اشتراك شهري", en: "Monthly subscription" },
    delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false,
    packages: [
      pack("الأساسية 720p – شهر (جهاز 1)", 125, "Basic 720p – 1 month (1 device)"),
      pack("القياسية 1080p – شهر (جهازان)", 210, "Standard 1080p – 1 month (2 devices)"),
      pack("غالي 4K+HDR – شهر (4 أجهزة)", 295, "Premium 4K+HDR – 1 month (4 devices)"),
    ],
  },
  {
    id: 12, category: "subs", image: "/images/p12.jpg",
    name: { ar: "انغامي بلس", en: "Anghami Plus" },
    description: { ar: "اشتراك رقمي", en: "Digital subscription" },
    delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false,
    packages: [
      pack("شهر", 80, "1 month"), pack("3 شهور", 225, "3 months"),
      pack("6 شهور", 440, "6 months"), pack("سنة", 870, "1 year"),
      pack("الاشتراك العائلي – شهر", 125, "Family – 1 month"),
      pack("الاشتراك العائلي – 3 شهور", 360, "Family – 3 months"),
      pack("الاشتراك العائلي – 6 شهور", 700, "Family – 6 months"),
    ],
  },
];

export const discountCodes: Record<string, { percent: number; category?: CategoryId }> = {
  VEX10: { percent: 2, category: "gaming" },
};

export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value) +
    (locale === "ar" ? " ج.م" : " EGP");
}

export const copy = {
  ar: {
    tagline: "عالمك الرقمي بمستوى أرقى",
    subtitle: "شحن ألعاب وبطاقات هدايا ومنتجات رقمية أصلية في مصر.",
    explore: "تصفّح المتجر", products: "المنتجات", all: "الكل",
    why: "لماذا VEXORA؟", authentic: "منتجات أصلية", authenticDesc: "من موردين معتمدين فقط.",
    fast: "تسليم سريع", fastDesc: "الوقت المتوقع موضّح لكل منتج.",
    local: "دفع محلي", localDesc: "فودافون كاش وإنستاباي وتحويل بنكي.",
    track: "تتبّع طلبك", orderNumber: "رقم الطلب", phone: "رقم الهاتف", trackButton: "تتبّع",
    notFound: "لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف.",
    add: "أضف للسلة", choosePackage: "اختر الباقة", playerId: "معرّف اللاعب (Player ID)",
    playerIdError: "أدخل Player ID صحيح (من 5 إلى 14 رقمًا).",
    cart: "السلة", emptyCart: "السلة فارغة.", emptyCartHelp: "اكتشف منتجاتنا الرقمية وأضف ما يعجبك.",
    subtotal: "المجموع الفرعي", discountCode: "كود الخصم", apply: "تطبيق", discount: "الخصم",
    invalidCode: "كود الخصم غير صحيح", wrongCategory: "هذا الكود يخص فئة:",
    total: "الإجمالي", fullName: "الاسم الكامل", email: "البريد (اختياري)",
    payment: "طريقة الدفع", bank: "تحويل بنكي", placeOrder: "إرسال طلب الشراء",
    required: "أكمل البيانات المطلوبة باسم صحيح ورقم هاتف صحيح.",
    received: "تم استلام طلبك رقم", paymentNote: "لم يتم تأكيد أي دفعة بعد. أرسل الطلب عبر واتساب لإتمام الدفع، والحالة: في انتظار الدفع.",
    status: "الحالة", delivery: "التسليم", available: "متوفر", close: "إغلاق",
    whatsapp: "أرسل الطلب عبر واتساب", copyMessage: "نسخ الرسالة", copied: "تم نسخ الرسالة!",
    orderDetails: "تفاصيل الطلب", orderPlaced: "تم استلام طلبك!", trackHint: "يمكنك تتبّع حالة طلبك في أي وقت.",
    loading: "جارٍ التحميل...", processing: "جارٍ إرسال الطلب...", error: "حدث خطأ. حاول مرة أخرى.",
    trackMissing: "أدخل رقم الطلب ورقم الهاتف للتتبّع.",
    trackStatus: "حالة طلبك", placedOn: "تاريخ الطلب", paymentMethod: "طريقة الدفع",
    items: "المنتجات", timeline: "تحديثات الطلب", noUpdates: "لم ترد تحديثات جديدة بعد.",
    continueShopping: "متابعة التسوّق", remove: "حذف", admin: "Admin",
    secureCheckout: "تأكيد الطلب عبر واتساب بعد الإرسال",
    stateReceived: "تم استلام الطلب", statePaid: "تم تأكيد الدفع", stateProcessing: "قيد التنفيذ",
    stateReady: "جاهز للتسليم", stateDelivered: "تم التسليم", stateCancelled: "تم إلغاء الطلب",
    connectionError: "تعذّر الاتصال. حاول مرة أخرى.",
  },
  en: {
    tagline: "Your Digital World Elevated",
    subtitle: "Authentic game top-ups, gift cards and digital products in Egypt.",
    explore: "Explore Store", products: "Products", all: "All",
    why: "Why VEXORA?", authentic: "Authentic products", authenticDesc: "Authorized suppliers only.",
    fast: "Fast delivery", fastDesc: "Estimated time shown per product.",
    local: "Local payment", localDesc: "Vodafone Cash, InstaPay, bank transfer.",
    track: "Track your order", orderNumber: "Order number", phone: "Phone number", trackButton: "Track",
    notFound: "Order not found. Check your order number and phone number.",
    add: "Add to cart", choosePackage: "Choose a package", playerId: "Player ID",
    playerIdError: "Enter a valid Player ID (5–14 digits).",
    cart: "Cart", emptyCart: "Your cart is empty.", emptyCartHelp: "Explore our digital products and find something you love.",
    subtotal: "Subtotal", discountCode: "Discount code", apply: "Apply", discount: "Discount",
    invalidCode: "Invalid discount code", wrongCategory: "This code applies only to:",
    total: "Total", fullName: "Full name", email: "Email (optional)",
    payment: "Payment method", bank: "Bank transfer", placeOrder: "Submit order request",
    required: "Please enter a valid name and phone number.",
    received: "Order received:", paymentNote: "No payment confirmed yet. Send the order via WhatsApp to complete payment. Status: Awaiting Payment.",
    status: "Status", delivery: "Delivery", available: "In stock", close: "Close",
    whatsapp: "Send order via WhatsApp", copyMessage: "Copy message", copied: "Message copied!",
    orderDetails: "Order details", orderPlaced: "Order received!", trackHint: "You can track your order at any time.",
    loading: "Loading...", processing: "Submitting your order...", error: "Something went wrong. Please try again.",
    trackMissing: "Enter your order number and phone number to track.",
    trackStatus: "Your order status", placedOn: "Order date", paymentMethod: "Payment method",
    items: "Items", timeline: "Order updates", noUpdates: "No new updates yet.",
    continueShopping: "Continue shopping", remove: "Remove", admin: "Admin",
    secureCheckout: "Confirm your order on WhatsApp after submitting",
    stateReceived: "Order received", statePaid: "Payment confirmed", stateProcessing: "Processing",
    stateReady: "Ready for delivery", stateDelivered: "Delivered", stateCancelled: "Cancelled",
    connectionError: "Could not connect. Please try again.",
  },
} as const;
