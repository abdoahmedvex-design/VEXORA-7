import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { checkAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = checkAdmin(request);
  if (denied) return denied;
  let body: { dataUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
  if (dataUrl.length > 420000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    return NextResponse.json({ error: "Invalid or too large image." }, { status: 400 });
  }
  const id = randomBytes(8).toString("hex");
  try {
    await db.insert(siteSettings).values({ key: `img:${id}`, value: dataUrl });
    return NextResponse.json({ url: `/api/img/${id}` });
  } catch (error) {
    console.error("Could not save image", error);
    return NextResponse.json({ error: "Could not save the image." }, { status: 500 });
  }
}
