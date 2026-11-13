import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { orders, pointsLedger, users } from "@/db/schema";
import { POINTS, pointsToEgp } from "@/lib/points";

export const metadata = { title: "حسابي | VEXORA" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  received: "تم الاستلام",
  paid: "تم الدفع",
  processing: "جاري التنفيذ",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export default async function AccountPage() {
  const session = await auth();
  const uid = Number((session?.user as { id?: string } | undefined)?.id);
  if (!uid) redirect("/login");

  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) redirect("/login");

  const myOrders = await db.select().from(orders).where(eq(orders.userId, uid)).orderBy(desc(orders.createdAt)).limit(20);
  const ledger = await db.select().from(pointsLedger).where(eq(pointsLedger.userId, uid)).orderBy(desc(pointsLedger.createdAt)).limit(15);

  return (
    <main dir="rtl" className="min-h-screen bg-[#080808] px-5 py-10 text-[#F5F1E7]">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">أهلًا {u.name}</h1>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="text-sm text-[#F5F1E7]/70 underline">تسجيل الخروج</button>
          </form>
        </div>

        <section className="mt-6 rounded-xl border border-[#D6B45B]/40 bg-[#242424]/40 p-5">
          <div className="text-sm text-[#F5F1E7]/70">رصيد نقاطك</div>
          <div className="mt-1 text-4xl font-bold text-[#D6B45B]">{u.points}</div>
          <p className="mt-2 text-sm text-[#F5F1E7]/80">
            تساوي خصم {pointsToEgp(u.points)} جنيه. كل {POINTS.egpPerPoint} جنيه تدفعهم = نقطة، وكل {PO
