import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, pointsLedger, users } from "@/db/schema";

export type Executor = Pick<typeof db, "select" | "insert" | "update">;

// عدّل القواعد هنا
export const POINTS = {
  egpPerPoint: 10, // كل 10 جنيه مدفوعة = نقطة
  redeemBlock: 100, // الاستبدال كل 100 نقطة
  egpPerBlock: 20, // كل 100 نقطة = 20 جنيه خصم
  maxShare: 0.5, // أقصى خصم بالنقاط = نص قيمة الطلب
};

export const pointsToEgp = (p: number) => Math.floor(p / POINTS.redeemBlock) * POINTS.egpPerBlock;
export const earnedFor = (paidTotal: number) => Math.floor(paidTotal / POINTS.egpPerPoint);

// أقصى نقاط يقدر العميل يستبدلها على طلب قيمته orderTotal
export function maxRedeemablePoints(balance: number, orderTotal: number) {
  const byBalance = Math.floor(balance / POINTS.redeemBlock);
  const byOrder = Math.floor((orderTotal * POINTS.maxShare) / POINTS.egpPerBlock);
  return Math.max(0, Math.min(byBalance, byOrder)) * POINTS.redeemBlock;
}

// يضيف نقاط الطلب مرة واحدة بس (حتى لو اتنادت أكتر من مرة)
export async function awardPointsForOrder(orderId: number, ex: Executor = db) {
  const [o] = await ex.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o?.userId) return 0;
  const pts = earnedFor(o.total);
  if (pts <= 0) return 0;
  const inserted = await ex
    .insert(pointsLedger)
    .values({ userId: o.userId, orderId, delta: pts, reason: "earn" })
    .onConflictDoNothing()
    .returning({ id: pointsLedger.id });
  if (inserted.length === 0) return 0;
  await ex.update(users).set({ points: sql`${users.points} + ${pts}` }).where(eq(users.id, o.userId));
  return pts;
}

// لو الطلب اتلغى، بيرجّع النقاط اللي اتستبدلت فيه (مرة واحدة بس)
export async function refundPointsForOrder(orderId: number, ex: Executor = db) {
  const [o] = await ex.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o?.userId || o.pointsUsed <= 0) return 0;
  const inserted = await ex
    .insert(pointsLedger)
    .values({ userId: o.userId, orderId, delta: o.pointsUsed, reason: "refund" })
    .onConflictDoNothing()
    .returning({ id: pointsLedger.id });
  if (inserted.length === 0) return 0;
  await ex.update(users).set({ points: sql`${users.points} + ${o.pointsUsed}` }).where(eq(users.id, o.userId));
  return o.pointsUsed;
}
