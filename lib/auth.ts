import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { isOpitEmail, upsertUser, getUser } from "@/lib/users"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    // Any OPIT account: students, faculty, staff — @opit.com and every *.opit.com
    async signIn({ user, profile }) {
      const email = (user.email ?? "").toLowerCase()
      const verified = (profile as any)?.email_verified !== false
      if (!verified || !isOpitEmail(email)) return false
      await upsertUser(email, user.name).catch(err => console.error("upsertUser failed:", err))
      return true
    },
    async jwt({ token, trigger }) {
      if (token.email && (!token.role || trigger === "update")) {
        const u = await getUser(token.email).catch(() => null)
        if (u) token.role = u.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role ?? "student"
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
