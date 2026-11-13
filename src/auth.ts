import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isEmail, normalizePhone, verifyPassword } from "@/lib/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Credentials({
      credentials: { identifier: {}, password: {} },
      async authorize(c) {
        const raw = String(c?.identifier ?? "").trim().toLowerCase();
        const password = String(c?.password ?? "");
        if (!raw || !password) return null;
        const byEmail = isEmail(raw);
        const [u] = await db
          .select()
          .from(users)
          .where(byEmail ? eq(users.email, raw) : eq(users.phone, normalizePhone(raw)))
          .limit(1);
        if (!u?.passwordHash || !(await verifyPassword(password, u.passwordHash))) return null;
        return { id: String(u.id), name: u.name, email: u.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user?.id) token.uid = user.id;
      if (account?.provider === "google" && token.email) {
        const email = token.email.toLowerCase();
        let [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!u) {
          [u] = await db
            .insert(users)
            .values({ name: token.name || email.split("@")[0], email })
            .returning();
        }
        token.uid = String(u.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) (session.user as { id?: string }).id = String(token.uid);
      return session;
    },
  },
});
