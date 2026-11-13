import LoginForm from "./LoginForm";

export const metadata = { title: "تسجيل الدخول | VEXORA" };

export default function LoginPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#080808] px-5 py-12 text-[#F5F1E7]">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold text-[#D6B45B]">حسابك في VEXORA</h1>
        <p className="mt-2 text-[#F5F1E7]/70">سجّل دخولك واكسب نقطة على كل 10 جنيه تشحنهم، وبدّلها بخصم.</p>
        <LoginForm />
      </div>
    </main>
  );
}
