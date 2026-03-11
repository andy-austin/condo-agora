import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "OTP",
      credentials: {
        identifier: { label: "Phone or Email", type: "text" },
        code: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.code) return null;

        try {
          const res = await fetch(`${FASTAPI_URL}/auth/otp/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": INTERNAL_API_SECRET,
            },
            body: JSON.stringify({
              identifier: credentials.identifier,
              code: credentials.code,
            }),
          });

          if (!res.ok) return null;

          const user = await res.json();
          return {
            id: user.nextauth_id,
            email: user.email,
            phone: user.phone,
            name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
            image: user.avatar_url,
          };
        } catch {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.phone = (user as any).phone;
      }
      if (account?.provider === "google" && user?.email) {
        try {
          const res = await fetch(`${FASTAPI_URL}/auth/otp/google-link`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": INTERNAL_API_SECRET,
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });
          if (res.ok) {
            const dbUser = await res.json();
            token.sub = dbUser.nextauth_id;
            token.phone = dbUser.phone;
          }
        } catch {
          // Non-blocking
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
});
