import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { defaultCatalog, type Catalog, type Category, type DiscountRule, type Localized, type Product, type ProductPackage } from "@/lib/store-data";
import { eq } from "drizzle-orm";

type Result = { ok: true; catalog: Catalog } | { ok: false; error: string };

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value.trim() : null;
}

function loc(value: unknown, max: number): Localized | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const ar = str(record.ar, max);
  const en = str(record.en, max);
  return ar === null || en === null ? null : { ar, en };
}

function int(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function validImage(value: unknown): string | null {
  const image = str(value, 300);
  if (image === null) return null;
  return image === "" || image.startsWith("/") || image.startsWith("https://") ? image : null;
}

export function sanitizeCatalog(input: unknown): Result {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid catalog." };
  const raw = input as Record<string, unknown>;

  if (!Array.isArray(raw.categories) || raw.categories.length < 1 || raw.categories.length > 20) {
    return { ok: false, error: "Add at least one category (max 20)." };
  }
  const categories: Category[] = [];
  for (const entry of raw.categories) {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const id = str(item.id, 30);
    const icon = str(item.icon, 8);
    const name = loc(item.name, 60);
    if (!id || !/^[a-z0-9-]+$/.test(id) || icon === null || !name || !name.ar || !name.en) {
      return { ok: false, error: "Each category needs an Arabic name and an English name." };
    }
    if (categories.some((category) => category.id === id)) return { ok: false, error: "Duplicate category." };
    categories.push({ id, icon: icon || "🛍️", name });
  }

  if (!Array.isArray(raw.products) || raw.products.length > 200) {
    return { ok: false, error: "Too many products (max 200)." };
  }
  const products: Product[] = [];
  for (const entry of raw.products) {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const id = int(item.id, 1, 1000000);
    const category = str(item.category, 30);
    const name = loc(item.name, 120);
    const description = loc(item.description, 300);
    const delivery = loc(item.delivery, 80);
    const image = validImage(item.image);
    if (id === null || !category || !categories.some((entry2) => entry2.id === category)) {
      return { ok: false, error: "A product has an invalid category." };
    }
    if (products.some((product) => product.id === id)) return { ok: false, error: "Duplicate product." };
    if (!name || !name.ar || !name.en) return { ok: false, error: `Product ${id}: add an Arabic name and an English name.` };
    if (!description || !delivery) return { ok: false, error: `Product ${name.en}: invalid description or delivery text.` };
    if (image === null) return { ok: false, error: `Product ${name.en}: invalid image.` };
    if (!Array.isArray(item.packages) || item.packages.length < 1 || item.packages.length > 40) {
      return { ok: false, error: `Product ${name.en}: add between 1 and 40 packages.` };
    }
    const packages: ProductPackage[] = [];
    for (const pkgEntry of item.packages) {
      const pkg = (pkgEntry && typeof pkgEntry === "object" ? pkgEntry : {}) as Record<string, unknown>;
      const label = loc(pkg.label, 120);
      const price = int(pkg.price, 1, 10000000);
      if (!label || !label.ar || !label.en || price === null) {
        return { ok: false, error: `Product ${name.en}: every package needs Arabic and English names and a price above 0.` };
      }
      const oldPrice = pkg.oldPrice === undefined || pkg.oldPrice === null ? undefined : int(pkg.oldPrice, 1, 10000000);
      if (oldPrice === null) return { ok: false, error: `Product ${name.en}: invalid price before discount.` };
      packages.push(oldPrice && oldPrice > price ? { label, price, oldPrice } : { label, price });
    }
    products.push({
      id, category, image, name, description, delivery,
      requiresPlayerId: item.requiresPlayerId === true,
      ...(item.hidden === true ? { hidden: true } : {}),
      packages,
    });
  }

  const discountCodes: Record<string, DiscountRule> = {};
  const rawCodes = (raw.discountCodes && typeof raw.discountCodes === "object" ? raw.discountCodes : {}) as Record<string, unknown>;
  const codeKeys = Object.keys(rawCodes);
  if (codeKeys.length > 50) return { ok: false, error: "Too many discount codes (max 50)." };
  for (const key of codeKeys) {
    const code = key.trim().toUpperCase();
    const rule = (rawCodes[key] && typeof rawCodes[key] === "object" ? rawCodes[key] : {}) as Record<string, unknown>;
    const percent = int(rule.percent, 1, 90);
    const category = rule.category === undefined || rule.category === null || rule.category === "" ? undefined : str(rule.category, 30);
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return { ok: false, error: `Invalid code name: ${key}` };
    if (percent === null) return { ok: false, error: `Code ${code}: the discount must be between 1 and 90.` };
    if (category === null || (category && !categories.some((entry) => entry.id === category))) {
      return { ok: false, error: `Code ${code}: invalid category.` };
    }
    discountCodes[code] = {
      percent,
      ...(category ? { category } : {}),
      ...(rule.active === false ? { active: false } : {}),
    };
  }

  const rawBanner = (raw.banner && typeof raw.banner === "object" ? raw.banner : {}) as Record<string, unknown>;
  const bannerText = loc(rawBanner.text, 200) || { ar: "", en: "" };

  return {
    ok: true,
    catalog: { categories, products, discountCodes, banner: { enabled: rawBanner.enabled === true, text: bannerText } },
  };
}

export async function getCatalog(): Promise<Catalog> {
  try {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "catalog")).limit(1);
    if (row) {
      const parsed = sanitizeCatalog(JSON.parse(row.value));
      if (parsed.ok) return parsed.catalog;
    }
  } catch (error) {
    console.error("Could not load catalog", error);
  }
  return defaultCatalog;
}

export async function saveCatalog(catalog: Catalog) {
  const value = JSON.stringify(catalog);
  await db.insert(siteSettings).values({ key: "catalog", value }).onConflictDoUpdate({
    target: siteSettings.key,
    set: { value, updatedAt: new Date() },
  });
}
