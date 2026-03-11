import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  const session = await auth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward the JWT token to FastAPI if user is authenticated
  if (session?.user?.id) {
    const token = await encode({
      token: {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: (session.user as any).phone,
      },
      secret: NEXTAUTH_SECRET,
      salt: "",
    });
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
