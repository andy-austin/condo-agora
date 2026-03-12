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
            requiresProfileCompletion: user.requires_profile_completion || false,
            hasMemberships: user.has_memberships || false,
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
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.phone = (user as any).phone;
        token.image = user.image || null;
        token.requiresProfileCompletion = (user as any).requiresProfileCompletion || false;
        token.hasMemberships = (user as any).hasMemberships || false;
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
            token.requiresProfileCompletion = dbUser.requires_profile_completion || false;
            token.hasMemberships = dbUser.has_memberships || false;
          }
        } catch {
          // Non-blocking
        }
      }
      if (trigger === "update" && session) {
        if ("image" in session) token.image = session.image;
        if ("name" in session) token.name = session.name;
        if ("requiresProfileCompletion" in session) token.requiresProfileCompletion = session.requiresProfileCompletion;
        if ("hasMemberships" in session) token.hasMemberships = session.hasMemberships;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.image = (token.image as string) || null;
        (session.user as any).phone = token.phone;
        (session.user as any).requiresProfileCompletion = token.requiresProfileCompletion || false;
        (session.user as any).hasMemberships = token.hasMemberships || false;
      }
      return session;
    },
  },
});
