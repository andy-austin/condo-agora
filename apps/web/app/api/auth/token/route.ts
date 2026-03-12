import { auth } from "@/lib/auth";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ token: null });
  }

  const secret = new TextEncoder().encode(NEXTAUTH_SECRET);
  const token = await new SignJWT({
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: (session.user as any).phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return NextResponse.json({ token });
}
