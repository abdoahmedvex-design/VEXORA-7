import { getCatalog } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json({
    categories: catalog.categories,
    products: catalog.products.filter((product) => !product.hidden),
    banner: catalog.banner,
  });
}
