import { checkAdmin } from "@/lib/admin-auth";
import { getCatalog, sanitizeCatalog, saveCatalog } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = checkAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ catalog: await getCatalog() });
}

export async function PUT(request: Request) {
  const denied = checkAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = sanitizeCatalog(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  try {
    await saveCatalog(result.catalog);
    return NextResponse.json({ success: true, catalog: result.catalog });
  } catch (error) {
    console.error("Could not save catalog", error);
    return NextResponse.json({ error: "Could not save. Did you create the site_settings table in Neon?" }, { status: 500 });
  }
}
