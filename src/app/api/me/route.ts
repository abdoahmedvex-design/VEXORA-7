import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { maxRedeemablePoints, POINTS, pointsToEgp } from "@/lib/points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me?total=1250  ->  حالة الدخول + رصيد النقاط + أقصى نقاط تتستبدل على الطلب ده
export async function GET(request: Request) {
  const session = await auth();
  const uid = Number((session?.user as { id?: string } | undefined)?.id) || 0;
  if (!uid) return NextResponse.json({ loggedIn: false });
  const [u] = await db.select({ name: users.name, points: users.points }).from(users).where(eq(users.id, uid)).limit(1);
  if (!u) return NextResponse.json({ loggedIn: false });

  const total = Number(new URL(request.url).searchParams.get("total")) || 0;
  const usable = maxRedeemablePoints(u.points, total);
  return NextResponse.json({
    loggedIn: true,
    name: u.name,
    points: u.points,
    usablePoints: usable,
    usableEgp: pointsToEgp(usable),
    rules: POINTS,
  });
}
