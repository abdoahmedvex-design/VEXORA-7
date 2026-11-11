import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{16}$/.test(id)) return new Response("Not found", { status: 404 });
  try {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, `img:${id}`)).limit(1);
    const match = row ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(row.value) : null;
    if (!match) return new Response("Not found", { status: 404 });
    const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
    return new Response(bytes as unknown as BodyInit, {
      headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
