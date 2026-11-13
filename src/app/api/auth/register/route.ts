import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, isEgPhone, isEmail, normalizePhone } from "@/lib/credentials";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  const phone = normalizePhone(String(b.phone ?? ""));
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");

  if (name.length < 2) return NextResponse.json({ error: "اكتب اسمك" }, { status: 400 });
  if (!isEgPhone(phone)) return NextResponse.json({ error: "رقم الموبايل غير صحيح" }, { status: 400 });
  if (email && !isEmail(email)) return NextResponse.json({ error: "الإيميل غير صحيح" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "الباسورد 8 حروف على الأقل" }, { status: 400 });

  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(email ? or(eq(users.phone, phone), eq(users.email, email)) : eq(users.phone, phone))
    .limit(1);
  if (clash.length) return NextResponse.json({ error: "الرقم أو الإيميل مسجّل قبل كده" }, { status: 409 });

  await db.insert(users).values({ name, phone, email: email || null, passwordHash: await hashPassword(password) });
  return NextResponse.json({ ok: true });
}
