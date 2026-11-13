"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const input =
  "w-full rounded-lg border border-[#242424] bg-[#242424]/50 px-4 py-3 text-[#F5F1E7] outline-none focus:border-[#D6B45B]";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", phone: "", email: "", identifier: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function login(identifier: string, password: string) {
    const r = await signIn("credentials", { identifier, password, redirect: false });
    if (r?.error) throw new Error("بيانات الدخول غير صحيحة");
    router.push("/account");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(f),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "حصل خطأ");
        await login(f.phone, f.password);
      } else {
        await login(f.identifier, f.password);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "حصل خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/account" })}
        className="w-full rounded-lg border border-[#D6B45B]/60 px-4 py-3 font-semibold text-[#D6B45B] active:bg-[#D6B45B]/10"
      >
        المتابعة بحساب جوجل
      </button>
      <div className="my-6 border-t border-[#242424]" />

      <form onSubmit={submit} className="space-y-3">
        {mode === "register" ? (
          <>
            <input className={input} placeholder="الاسم" value={f.name} onChange={set("name")} required />
            <input className={input} dir="ltr" inputMode="tel" placeholder="رقم الموبايل 01xxxxxxxxx" value={f.phone} onChange={set("phone")} required />
            <input className={input} dir="ltr" type="email" placeholder="الإيميل (اختياري)" value={f.email} onChange={set("email")} />
          </>
        ) : (
          <input className={input} dir="ltr" placeholder="رقم الموبايل أو الإيميل" value={f.identifier} onChange={set("identifier")} required />
        )}
        <input className={input} dir="ltr" type="password" placeholder="الباسورد" value={f.password} onChange={set("password")} required />
        {err ? <p role="alert" className="text-sm text-red-400">{err}</p> : null}
        <button disabled={busy} className="w-full rounded-lg bg-[#D6B45B] px-4 py-3 font-semibold text-[#080808] disabled:opacity-60">
          {mode === "login" ? "دخول" : "إنشاء حساب"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}
        className="mt-5 text-sm text-[#F5F1E7]/70 underline"
      >
        {mode === "login" ? "معندكش حساب؟ سجّل دلوقتي" : "عندك حساب؟ سجّل دخول"}
      </button>
    </div>
  );
}
