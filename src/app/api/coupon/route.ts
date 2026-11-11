import { getCatalog } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase().slice(0, 40) : "";
  const catalog = await getCatalog();
  const rule = code ? catalog.discountCodes[code] : undefined;
  if (!rule || rule.active === false) {
    return NextResponse.json({ error: "Invalid discount code." }, { status: 404 });
  }
  return NextResponse.json({ code, percent: rule.percent, ...(rule.category ? { category: rule.category } : {}) });
}
