import { db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function lastTenDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\D/g, "")
    .slice(-10);
}

export async function POST(request: Request) {
  let body: { number?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const number = typeof body?.number === "string" ? body.number.trim().toUpperCase().replace(/\s/g, "") : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!/^VX-[A-Z0-9]{6}$/.test(number) || lastTenDigits(phone).length < 10) {
    return NextResponse.json({ error: "Enter a valid order number and phone number." }, { status: 400 });
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
    if (!order || lastTenDigits(order.phone) !== lastTenDigits(phone)) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const events = await db.select({
      status: orderEvents.status,
      note: orderEvents.note,
      createdAt: orderEvents.createdAt,
    }).from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.createdAt));

    return NextResponse.json({
      number: order.number,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      items: order.items,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      events,
    });
  } catch (error) {
    console.error("Could not track order", error);
    return NextResponse.json({ error: "Could not track order." }, { status: 500 });
  }
}
