import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  const session = await auth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward an HS256 JWT to FastAPI if user is authenticated
  if (session?.user?.id) {
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
    headers["Authorization"] = `Bearer ${token}`;
  }

  const body = await request.text();

  const response = await fetch(`${FASTAPI_URL}/graphql`, {
    method: "POST",
    headers,
    body,
  });

  const data = await response.json();
  return NextResponse.json(data);
}
