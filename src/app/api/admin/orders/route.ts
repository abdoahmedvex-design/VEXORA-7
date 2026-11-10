import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const nextStatuses: Record<string, string[]> = {
  received: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function authorize(request: Request) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return "unconfigured";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const suppliedBuffer = Buffer.from(supplied);
  const secretBuffer = Buffer.from(secret);
  return suppliedBuffer.length === secretBuffer.length && timingSafeEqual(suppliedBuffer, secretBuffer)
    ? "authorized" : "unauthorized";
}

function checkAccess(request: Request) {
  const result = authorize(request);
  if (result === "unconfigured") {
    return NextResponse.json({ error: "Admin access is not configured on this deployment." }, { status: 503 });
  }
  if (result === "unauthorized") {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  try {
    const list = await db.select({
      number: orders.number,
      customerName: orders.customerName,
      phone: orders.phone,
      total: orders.total,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      items: orders.items,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    }).from(orders).orderBy(desc(orders.createdAt)).limit(60);
    return NextResponse.json({ orders: list });
  } catch (error) {
    console.error("Could not load admin orders", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  let body: { number?: unknown; status?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const number = typeof body?.number === "string" ? body.number.trim().toUpperCase() : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : "";
  if (!/^VX-[A-Z0-9]{6}$/.test(number) || !Object.hasOwn(nextStatuses, status)) {
    return NextResponse.json({ error: "Invalid order or status." }, { status: 400 });
  }

  try {
    const [current] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (status !== current.status && !nextStatuses[current.status]?.includes(status)) {
      return NextResponse.json({ error: "This status change is not allowed." }, { status: 400 });
    }
    if (status === current.status && !note) {
      return NextResponse.json({ error: "Add a note or change the status." }, { status: 400 });
    }
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, current.id));
      await tx.insert(orderEvents).values({ orderId: current.id, status, note: note || null });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not update order", error);
    return NextResponse.json({ error: "Could not update order." }, { status: 5
