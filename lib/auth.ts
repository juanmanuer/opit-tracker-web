import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const ALLOWED_DOMAINS = ["students.opit.com", "opit.com"]

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? ""
      const domain = email.split("@")[1]
      return ALLOWED_DOMAINS.includes(domain)
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}