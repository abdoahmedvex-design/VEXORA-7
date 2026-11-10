import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { orderEvents, orders, type StoredOrderItem } from "@/db/schema";
import { discountCodes, formatMoney, products, type Locale } from "@/lib/store-data";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RequestedItem = {
  productId: number;
  packageIndex: number;
  quantity: number;
  playerId?: string;
};

function normalizePhone(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[\s().-]/g, "");
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Invalid request.");
  } catch {
    return badRequest("Invalid request.");
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 160) : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone.trim()) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 255) : "";
  const paymentMethod = body.paymentMethod;
  const locale: Locale = body.locale === "en" ? "en" : "ar";
  const discountCode = typeof body.discountCode === "string" ? body.discountCode.trim().toUpperCase().slice(0, 40) : "";

  if (customerName.length < 2 || !/^\+?\d{10,14}$/.test(phone)) {
    return badRequest("Please enter a valid name and phone number.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Invalid email address.");
  if (paymentMethod !== "Vodafone Cash" && paymentMethod !== "InstaPay" && paymentMethod !== "Bank transfer") {
    return badRequest("Invalid payment method.");
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return badRequest("Your cart is empty or too large.");
  }

  const requestedItems = body.items as RequestedItem[];
  const items: StoredOrderItem[] = [];
  let subtotal = 0;
  let eligibleSubtotal = 0;
  let totalQuantity = 0;
  const code = discountCode ? discountCodes[discountCode] : undefined;
  if (discountCode && !code) return badRequest("Invalid discount code.");

  for (const requested of requestedItems) {
    if (!requested || typeof requested !== "object") return badRequest("Invalid product.");
    const product = products.find((candidate) => candidate.id === requested.productId);
    const packageIndex = requested.packageIndex;
    const quantity = requested.quantity;
    if (!product || !Number.isInteger(packageIndex) || !product.packages[packageIndex] ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return badRequest("Invalid product or quantity.");
    }
    const playerId = typeof requested.playerId === "string" ? requested.playerId.trim() : "";
    if (product.requiresPlayerId && !/^\d{5,14}$/.test(playerId)) return badRequest("Invalid Player ID.");
    const selectedPackage = product.packages[packageIndex];
    const lineTotal = selectedPackage.price * quantity;
    totalQuantity += quantity;
    subtotal += lineTotal;
    if (!code?.category || code.category === product.category) eligibleSubtotal += lineTotal;
    items.push({
      productId: product.id,
      productNameAr: product.name.ar,
      productNameEn: product.name.en,
      packageAr: selectedPackage.label.ar,
      packageEn: selectedPackage.label.en,
      unitPrice: selectedPackage.price,
      quantity,
      ...(playerId ? { playerId } : {}),
      image: product.image,
    });
  }
  if (totalQuantity > 50) return badRequest("Too many items in your cart.");
  if (code && eligibleSubtotal === 0) return badRequest("Discount does not apply to these items.");
  const discount = code ? Math.round(eligibleSubtotal * code.percent / 100) : 0;
  const total = subtotal - discount;
  const number = `VX-${randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(orders).values({
        number,
        customerName,
        phone,
        email: email || null,
        paymentMethod,
        subtotal,
        discount,
        discountCode: discountCode || null,
        total,
        status: "received",
        items,
      }).returning({ id: orders.id });
      await tx.insert(orderEvents).values({ orderId: created.id, status: "received" });
    });
  } catch (error) {
    console.error("Could not create order", error);
    return NextResponse.json({ error: "Could not place order. Please try again." }, { status: 500 });
  }

  const ar = locale === "ar";
  const message = (ar ? "مرحباً VEXORA، أريد تأكيد طلبي رقم " : "Hello VEXORA, I'd like to confirm my order ") + number + ":\n" +
    items.map((item) => `• ${ar ? item.productNameAr : item.productNameEn} – ${ar ? item.packageAr : item.packageEn}${item.playerId ? ` (ID: ${item.playerId})` : ""} × ${item.quantity}`).join("\n") +
    (discount ? `\n${ar ? "الخصم" : "Discount"}: −${formatMoney(discount, locale)} (${discountCode})` : "") +
    `\n${ar ? "الإجمالي" : "Total"}: ${formatMoney(total, locale)}` +
    `\n${ar ? "الاسم الكامل" : "Full name"}: ${customerName}` +
    `\n${ar ? "رقم الهاتف" : "Phone number"}: ${phone}` +
    `\n${ar ? "طريقة الدفع" : "Payment method"}: ${paymentMethod}`;
  const whatsappNumber = (process.env.WHATSAPP_NUMBER || "201004063941").replace(/\D/g, "");

  return NextResponse.json({
    number,
    phone,
    total,
    message,
    whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
  }, { status: 201 });
}
