"use client";

import { useEffect, useState } from "react";
import type { Catalog, DiscountRule, Locale, Product, ProductPackage } from "@/lib/store-data";

type Tab = "products" | "categories" | "codes" | "offers";

function toNumber(value: string) {
  const digits = value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Invalid image")); };
    image.src = url;
  });
}

async function compressImage(file: File): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#101010";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.85;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 380000 && quality > 0.4) {
    quality -= 0.1;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  return data;
}

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminCatalog({ password, locale, notify, onSaved, initialTab }: {
  password: string;
  locale: Locale;
  notify: (message: string) => void;
  onSaved: (catalog: Catalog) => void;
  initialTab?: Tab;
}) {
  const ar = locale === "ar";
  const tr = (arabic: string, english: string) => (ar ? arabic : english);
  const [draft, setDraft] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab || "products");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [newCode, setNewCode] = useState("");

  useEffect(() => setTab(initialTab || "products"), [initialTab]);

  const headers = { Authorization: `Bearer ${password}`, "Content-Type": "application/json" };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/admin/catalog", { headers: { Authorization: `Bearer ${password}` } });
        if (!response.ok) {
          if (!cancelled) setError(await readError(response, "Could not load the store."));
          return;
        }
        const result = await response.json() as { catalog: Catalog };
        if (!cancelled) setDraft(result.catalog);
      } catch {
        if (!cancelled) setError("Connection error.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [password]);

  function edit(change: (catalog: Catalog) => Catalog) {
    setDraft((previous) => (previous ? change(previous) : previous));
    setDirty(true);
  }

  function updateProduct(id: number, patch: Partial<Product>) {
    edit((catalog) => ({ ...catalog, products: catalog.products.map((product) => product.id === id ? { ...product, ...patch } : product) }));
  }

  function updatePackage(productId: number, index: number, patch: Partial<ProductPackage>) {
    edit((catalog) => ({
      ...catalog,
      products: catalog.products.map((product) => product.id === productId
        ? { ...product, packages: product.packages.map((pkg, position) => position === index ? { ...pkg, ...patch } : pkg) }
        : product),
    }));
  }

  function addProduct() {
    if (!draft) return;
    const id = draft.products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
    edit((catalog) => ({
      ...catalog,
      products: [...catalog.products, {
        id,
        category: catalog.categories[0]?.id || "",
        image: "",
        name: { ar: "", en: "" },
        description: { ar: "", en: "" },
        delivery: { ar: "خلال دقائق", en: "Within minutes" },
        requiresPlayerId: false,
        packages: [{ label: { ar: "", en: "" }, price: 0 }],
      }],
    }));
    setOpenId(id);
  }

  async function uploadImage(file: File): Promise<string | null> {
    setBusy(true);
    setError("");
    try {
      const dataUrl = await compressImage(file);
      const response = await fetch("/api/admin/image", { method: "POST", headers, body: JSON.stringify({ dataUrl }) });
      if (!response.ok) {
        setError(await readError(response, tr("تعذر رفع الصورة", "Could not upload the image")));
        return null;
      }
      const result = await response.json() as { url: string };
      notify(tr("تم رفع الصورة، اضغط حفظ", "Image uploaded, press Save"));
      return result.url;
    } catch {
      setError(tr("تعذر قراءة الصورة", "Could not read the image"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function pickProductImage(productId: number, file: File | undefined) {
    if (!file) return;
    const url = await uploadImage(file);
    if (url) updateProduct(productId, { image: url });
  }

  async function pickPackageImage(productId: number, index: number, file: File | undefined) {
    if (!file) return;
    const url = await uploadImage(file);
    if (url) updatePackage(productId, index, { image: url });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/catalog", { method: "PUT", headers, body: JSON.stringify(draft) });
      if (!response.ok) {
        setError(await readError(response, tr("تعذر الحفظ", "Could not save")));
        return;
      }
      const result = await response.json() as { catalog: Catalog };
      setDraft(result.catalog);
      setDirty(false);
      onSaved(result.catalog);
      notify(tr("تم حفظ التعديلات", "Changes saved"));
    } catch {
      setError(tr("تعذر الاتصال", "Connection error"));
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return <div className="admin-content">{error ? <div className="note admin-error" role="alert">{error}</div> : <p className="muted">...</p>}</div>;
  }

  const categoryName = (id: string) => draft.categories.find((category) => category.id === id)?.name[locale] || id;
  const categoryIcon = (id: string) => draft.categories.find((category) => category.id === id)?.icon || "🛍️";
  const tabs: { id: Tab; label: string }[] = [
    { id: "products", label: tr("المنتجات", "Products") },
    { id: "categories", label: tr("الأقسام", "Sections") },
    { id: "codes", label: tr("أكواد الخصم", "Discount codes") },
    { id: "offers", label: tr("العروض", "Offers") },
  ];

  return (
    <div className="admin-content">
      <div className="admin-tabs">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={`pill-button ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>

      {tab === "products" && (
        <div>
          {draft.products.map((product) => (
            <div key={product.id}>
              <button type="button" className={`admin-order ${openId === product.id ? "selected" : ""}`} onClick={() => setOpenId(openId === product.id ? null : product.id)}>
                <span><strong>{product.name[locale] || tr("منتج جديد", "New product")}</strong><small>{categoryName(product.category)}{product.hidden ? ` · ${tr("مخفي", "Hidden")}` : ""}</small></span>
                <span><strong>{product.packages.length}</strong><small>{tr("باقات", "packages")}</small></span>
              </button>
              {openId === product.id && (
                <div className="admin-update">
                  <div className="admin-thumb">
                    {product.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={product.image} alt="" />
                      : <span>{categoryIcon(product.category)}</span>}
                  </div>
                  <label className="muted">{tr("صورة المنتج الأساسية", "Primary product image")}</label>
                  <input className="field" type="file" accept="image/*" disabled={busy} onChange={(event) => { void pickProductImage(product.id, event.target.files?.[0]); event.target.value = ""; }} />
                  {product.image && <button type="button" className="pill-button" onClick={() => updateProduct(product.id, { image: "" })}>{tr("حذف صورة المنتج", "Remove product image")}</button>}

                  <label className="muted">{tr("الاسم بالعربي", "Name (Arabic)")}</label>
                  <input className="field" value={product.name.ar} onChange={(event) => updateProduct(product.id, { name: { ...product.name, ar: event.target.value } })} />
                  <label className="muted">{tr("الاسم بالإنجليزي", "Name (English)")}</label>
                  <input className="field" dir="ltr" value={product.name.en} onChange={(event) => updateProduct(product.id, { name: { ...product.name, en: event.target.value } })} />
                  <label className="muted">{tr("الوصف بالعربي", "Description (Arabic)")}</label>
                  <input className="field" value={product.description.ar} onChange={(event) => updateProduct(product.id, { description: { ...product.description, ar: event.target.value } })} />
                  <label className="muted">{tr("الوصف بالإنجليزي", "Description (English)")}</label>
                  <input className="field" dir="ltr" value={product.description.en} onChange={(event) => updateProduct(product.id, { description: { ...product.description, en: event.target.value } })} />
                  <label className="muted">{tr("مدة التسليم (عربي / إنجليزي)", "Delivery time (Arabic / English)")}</label>
                  <input className="field" value={product.delivery.ar} onChange={(event) => updateProduct(product.id, { delivery: { ...product.delivery, ar: event.target.value } })} />
                  <input className="field" dir="ltr" value={product.delivery.en} onChange={(event) => updateProduct(product.id, { delivery: { ...product.delivery, en: event.target.value } })} />

                  <label className="muted">{tr("القسم", "Section")}</label>
                  <select className="field" value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value })}>
                    {draft.categories.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name[locale]}</option>)}
                  </select>
                  <label className="admin-check"><input type="checkbox" checked={product.requiresPlayerId} onChange={(event) => updateProduct(product.id, { requiresPlayerId: event.target.checked })} /> {tr("يتطلب Player ID", "Requires Player ID")}</label>
                  <label className="admin-check"><input type="checkbox" checked={product.hidden === true} onChange={(event) => updateProduct(product.id, { hidden: event.target.checked })} /> {tr("إخفاء المنتج", "Hide product")}</label>

                  <h3>{tr("الباقات والأسعار", "Packages and prices")}</h3>
                  {product.packages.map((pkg, index) => (
                    <div className="admin-package" key={index}>
                      <div className="admin-package-preview">
                        {pkg.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={pkg.image} alt="" />
                          : <span>{tr("معاينة الباقة", "Package preview")}</span>}
                      </div>
                      <label className="muted">{tr("صورة هذه الباقة فقط", "Image for this package only")}</label>
                      <input className="field" type="file" accept="image/*" disabled={busy} onChange={(event) => { void pickPackageImage(product.id, index, event.target.files?.[0]); event.target.value = ""; }} />
                      {pkg.image && <button type="button" className="pill-button" onClick={() => updatePackage(product.id, index, { image: "" })}>{tr("حذف صورة الباقة", "Remove package image")}</button>}
                      <input className="field" placeholder={tr("اسم الباقة بالعربي", "Package name (Arabic)")} value={pkg.label.ar} onChange={(event) => updatePackage(product.id, index, { label: { ...pkg.label, ar: event.target.value } })} />
                      <input className="field" dir="ltr" placeholder={tr("اسم الباقة بالإنجليزي", "Package name (English)")} value={pkg.label.en} onChange={(event) => updatePackage(product.id, index, { label: { ...pkg.label, en: event.target.value } })} />
                      <div className="admin-grid2">
                        <input className="field" inputMode="numeric" placeholder={tr("السعر (ج.م)", "Price (EGP)")} value={pkg.price || ""} onChange={(event) => updatePackage(product.id, index, { price: toNumber(event.target.value) })} />
                        <input className="field" inputMode="numeric" placeholder={tr("السعر قبل الخصم", "Price before discount")} value={pkg.oldPrice || ""} onChange={(event) => updatePackage(product.id, index, { oldPrice: toNumber(event.target.value) || undefined })} />
                      </div>
                      {product.packages.length > 1 && (
                        <button type="button" className="pill-button" onClick={() => edit((catalog) => ({ ...catalog, products: catalog.products.map((entry) => entry.id === product.id ? { ...entry, packages: entry.packages.filter((_, position) => position !== index) } : entry) }))}>{tr("حذف الباقة", "Remove package")}</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="pill-button" onClick={() => updateProduct(product.id, { packages: [...product.packages, { label: { ar: "", en: "" }, price: 0 }] })}>+ {tr("إضافة باقة", "Add package")}</button>
                  <button type="button" className="pill-button danger-button" onClick={() => { if (window.confirm(tr("حذف المنتج نهائيًا؟", "Delete this product?"))) edit((catalog) => ({ ...catalog, products: catalog.products.filter((entry) => entry.id !== product.id) })); }}>{tr("حذف المنتج", "Delete product")}</button>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="gold-button admin-add" onClick={addProduct}>+ {tr("إضافة منتج جديد", "Add a new product")}</button>
        </div>
      )}

      {tab === "categories" && (
        <div>
          <p className="muted">{tr("الأقسام هي الخانات التي تظهر في المتجر.", "Sections group your products in the store.")}</p>
          {draft.categories.map((category, index) => {
            const used = draft.products.some((product) => product.category === category.id);
            return (
              <div className="admin-update" key={category.id}>
                <div className="admin-grid2">
                  <input className="field" value={category.icon} maxLength={4} aria-label="icon" onChange={(event) => edit((catalog) => ({ ...catalog, categories: catalog.categories.map((entry, position) => position === index ? { ...entry, icon: event.target.value } : entry) }))} />
                  <input className="field" value={category.name.ar} placeholder={tr("الاسم بالعربي", "Name (Arabic)")} onChange={(event) => edit((catalog) => ({ ...catalog, categories: catalog.categories.map((entry, position) => position === index ? { ...entry, name: { ...entry.name, ar: event.target.value } } : entry) }))} />
                </div>
                <input className="field" dir="ltr" value={category.name.en} placeholder={tr("الاسم بالإنجليزي", "Name (English)")} onChange={(event) => edit((catalog) => ({ ...catalog, categories: catalog.categories.map((entry, position) => position === index ? { ...entry, name: { ...entry.name, en: event.target.value } } : entry) }))} />
                <button type="button" className="pill-button" disabled={used || draft.categories.length < 2} onClick={() => edit((catalog) => ({ ...catalog, categories: catalog.categories.filter((entry) => entry.id !== category.id) }))}>{tr("حذف القسم", "Remove section")}</button>
              </div>
            );
          })}
          <button type="button" className="gold-button admin-add" onClick={() => edit((catalog) => ({ ...catalog, categories: [...catalog.categories, { id: `cat-${Date.now().toString(36)}`, icon: "🛍️", name: { ar: "قسم جديد", en: "New section" } }] }))}>+ {tr("إضافة قسم", "Add section")}</button>
        </div>
      )}

      {tab === "codes" && (
        <div>
          {Object.entries(draft.discountCodes).map(([code, rule]) => {
            const update = (patch: Partial<DiscountRule>) => edit((catalog) => ({ ...catalog, discountCodes: { ...catalog.discountCodes, [code]: { ...rule, ...patch } } }));
            return (
              <div className="admin-update" key={code}>
                <h3 dir="ltr">{code}</h3>
                <div className="admin-grid2">
                  <input className="field" inputMode="numeric" value={rule.percent || ""} placeholder="%" onChange={(event) => update({ percent: toNumber(event.target.value) })} />
                  <select className="field" value={rule.category || ""} onChange={(event) => update({ category: event.target.value || undefined })}>
                    <option value="">{tr("كل الأقسام", "All sections")}</option>
                    {draft.categories.map((category) => <option key={category.id} value={category.id}>{category.name[locale]}</option>)}
                  </select>
                </div>
                <label className="admin-check"><input type="checkbox" checked={rule.active !== false} onChange={(event) => update({ active: event.target.checked })} /> {tr("الكود مفعل", "Code active")}</label>
                <button type="button" className="pill-button" onClick={() => edit((catalog) => { const next = { ...catalog.discountCodes }; delete next[code]; return { ...catalog, discountCodes: next }; })}>{tr("حذف الكود", "Remove code")}</button>
              </div>
            );
          })}
          <div className="admin-update">
            <input className="field" dir="ltr" value={newCode} placeholder={tr("كود جديد", "New code")} onChange={(event) => setNewCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} />
            <button type="button" className="gold-button" disabled={newCode.length < 2 || !!draft.discountCodes[newCode]} onClick={() => edit((catalog) => ({ ...catalog, discountCodes: { ...catalog.discountCodes, [newCode]: { percent: 5, active: true } } }))}>+ {tr("إضافة الكود", "Add code")}</button>
          </div>
        </div>
      )}

      {tab === "offers" && (
        <div className="admin-update">
          <p className="muted">{tr("شريط عرض يظهر فوق المتجر. لاستخدام سعر قديم مشطوب، اضبط السعر قبل الخصم لكل باقة.", "A promotional banner shown across the store. To show a crossed old price, set an old price on a package.")}</p>
          <label className="admin-check"><input type="checkbox" checked={draft.banner.enabled} onChange={(event) => edit((catalog) => ({ ...catalog, banner: { ...catalog.banner, enabled: event.target.checked } }))} /> {tr("تفعيل العرض", "Enable offer")}</label>
          <input className="field" value={draft.banner.text.ar} placeholder={tr("نص العرض بالعربي", "Offer text (Arabic)")} onChange={(event) => edit((catalog) => ({ ...catalog, banner: { ...catalog.banner, text: { ...catalog.banner.text, ar: event.target.value } } }))} />
          <input className="field" dir="ltr" value={draft.banner.text.en} placeholder={tr("نص العرض بالإنجليزي", "Offer text (English)")} onChange={(event) => edit((catalog) => ({ ...catalog, banner: { ...catalog.banner, text: { ...catalog.banner.text, en: event.target.value } } }))} />
        </div>
      )}

      {error && <div className="note admin-error" role="alert">{error}</div>}
      <div className="admin-savebar">
        <button type="button" className="gold-button" disabled={busy || !dirty} onClick={() => void save()}>{busy ? "..." : dirty ? tr("حفظ التعديلات", "Save changes") : tr("لا توجد تغييرات", "No changes")}</button>
      </div>
    </div>
  );
}
