import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { orders, pointsLedger, users } from "@/db/schema";
import { POINTS, pointsToEgp } from "@/lib/points";

const STATUS: Record<string, string> = {
  received: "تم الاستلام",
  paid: "تم الدفع",
  processing: "جاري التنفيذ",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export default async function AccountView() {
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
            تساوي خصم {pointsToEgp(u.points)} جنيه. كل {POINTS.egpPerPoint} جنيه تدفعهم = نقطة، وكل {POINTS.redeemBlock} نقطة = {POINTS.egpPerBlock} جنيه خصم.
          </p>
          <p className="mt-1 text-xs text-[#F5F1E7]/60">النقاط بتتضاف بعد تسليم الطلب.</p>
        </section>

        <h2 className="mt-8 text-lg font-semibold">طلباتك</h2>
        <div className="mt-3 space-y-2">
          {myOrders.length === 0 ? (
            <p className="text-[#F5F1E7]/70">مفيش طلبات لسه. <Link href="/" className="text-[#D6B45B] underline">ابدأ التسوق</Link></p>
          ) : (
            myOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-[#242424] px-4 py-3">
                <div>
                  <div className="font-medium" dir="ltr">{o.number}</div>
                  <div className="text-xs text-[#F5F1E7]/60">{STATUS[o.status] ?? o.status}</div>
                </div>
                <div className="text-[#D6B45B]">{o.total} جنيه</div>
              </div>
            ))
          )}
        </div>

        {ledger.length > 0 ? (
          <>
            <h2 className="mt-8 text-lg font-semibold">سجل النقاط</h2>
            <div className="mt-3 space-y-2">
              {ledger.map((l) => (
                <div key={l.id} className="flex justify-between border-b border-[#242424] pb-2 text-sm">
                  <span className="text-[#F5F1E7]/80">{l.reason === "earn" ? "نقاط من طلب" : l.reason === "refund" ? "استرجاع نقاط" : "استبدال نقاط"}</span>
                  <span dir="ltr" className={l.delta > 0 ? "text-[#D6B45B]" : "text-[#F5F1E7]/70"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
