import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function checkAdmin(request: Request) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    return NextResponse.json({ error: "Admin access is not configured on this deployment." }, { status: 503 });
  }
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const suppliedBuffer = Buffer.from(supplied);
  const secretBuffer = Buffer.from(secret);
  if (suppliedBuffer.length !== secretBuffer.length || !timingSafeEqual(suppliedBuffer, secretBuffer)) {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }
  return null;
}
