"use client";

import { useMemo, useState, type FormEvent } from "react";
import AdminCatalog from "@/components/admin-catalog";
import { formatMoney, type Catalog, type Locale } from "@/lib/store-data";

type Section = "overview" | "orders" | "catalog" | "offers" | "settings";
type AdminOrder = {
  number: string;
  customerName: string;
  phone: string;
  total: number;
  status: string;
  paymentMethod: string;
  items: { productNameAr: string; productNameEn: string; quantity: number }[];
  createdAt: string;
  updatedAt: string;
};

type OrderResponse = { orders?: AdminOrder[]; error?: string };
type CatalogResponse = { catalog?: Catalog; error?: string };

const statusLabels: Record<string, { ar: string; en: string }> = {
  received: { ar: "تم الاستلام", en: "Received" },
  paid: { ar: "تم الدفع", en: "Paid" },
  processing: { ar: "قيد التنفيذ", en: "Processing" },
  ready: { ar: "جاهز للتسليم", en: "Ready" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};
const nextStatuses: Record<string, string[]> = {
  received: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
const sections: { id: Section; ar: string; en: string; icon: string }[] = [
  { id: "overview", ar: "نظرة عامة", en: "Overview", icon: "◈" },
  { id: "orders", ar: "الطلبات", en: "Orders", icon: "▤" },
  { id: "catalog", ar: "المنتجات والباقات", en: "Products & packages", icon: "◇" },
  { id: "offers", ar: "العروض", en: "Offers", icon: "✦" },
  { id: "settings", ar: "الإعدادات", en: "Settings", icon: "⚙" },
];

function localizedStatus(status: string, locale: Locale) {
  return statusLabels[status]?.[locale] ?? status;
}

async function responseError(response: Response, fallback: string) {
  try {
    const result = await response.json() as { error?: string };
    return result.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminDashboard() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [section, setSection] = useState<Section>("overview");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [nextStatus, setNextStatus] = useState("received");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const ar = locale === "ar";
  const tr = (arabic: string, english: string) => ar ? arabic : english;
  const selectedOrder = orders.find((order) => order.number === selectedNumber) ?? null;
  const visibleOrders = useMemo(() => filter === "all" ? orders : orders.filter((order) => order.status === filter), [filter, orders]);
  const openCount = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const deliveredRevenue = orders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + order.total, 0);
  const sectionTitle = sections.find((item) => item.id === section)?.[locale] ?? "VEXORA";

  async function loadOrders(token = password) {
    const response = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const data = await response.json() as OrderResponse;
    if (!response.ok) throw new Error(data.error || tr("تعذر تحميل الطلبات", "Could not load orders"));
    const list = data.orders || [];
    setOrders(list);
    setSelectedNumber((current) => list.some((order) => order.number === current) ? current : list[0]?.number || "");
    if (list[0]) setNextStatus(list[0].status);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loadOrders(password);
      setAuthenticated(true);
      const response = await fetch("/api/admin/catalog", { headers: { Authorization: `Bearer ${password}` }, cache: "no-store" });
      if (response.ok) {
        const data = await response.json() as CatalogResponse;
        setCatalog(data.catalog ?? null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tr("تعذر تسجيل الدخول", "Unable to sign in"));
    } finally {
      setBusy(false);
    }
  }

  async function updateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${password}`, "Content-Type": "application/json" },
        body: JSON.stringify({ number: selectedOrder.number, status: nextStatus, note }),
      });
      if (!response.ok) throw new Error(await responseError(response, tr("تعذر تحديث الطلب", "Could not update order")));
      setNote("");
      setNotice(tr("تم تحديث الطلب بنجاح", "Order updated successfully"));
      await loadOrders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tr("تعذر الاتصال", "Connection error"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteData(scope: "order" | "orders" | "points", number?: string) {
    const question = scope === "order"
      ? tr("حذف هذا الطلب نهائيًا؟", "Permanently delete this order?")
      : scope === "orders"
        ? tr("حذف جميع الطلبات نهائيًا؟ لا يمكن التراجع.", "Permanently delete all orders? This cannot be undone.")
        : tr("تصفير نقاط جميع العملاء ومسح سجل النقاط؟ لا يمكن التراجع.", "Reset all customer points and clear the points ledger? This cannot be undone.");
    if (!window.confirm(question)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}`, "Content-Type": "application/json" },
        body: JSON.stringify({ scope, number }),
      });
      if (!response.ok) throw new Error(await responseError(response, tr("تعذر تنفيذ العملية", "Action failed")));
      setNotice(tr("اكتملت العملية", "Action completed"));
      await loadOrders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tr("تعذر الاتصال", "Connection error"));
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setAuthenticated(false);
    setPassword("");
    setOrders([]);
    setCatalog(null);
    setSelectedNumber("");
    setSection("overview");
    setNotice("");
  }

  if (!authenticated) {
    return (
      <main className="vex-admin vex-admin-login" dir={ar ? "rtl" : "ltr"}>
        <section className="admin-login-card">
          <a className="admin-brand" href="/" aria-label="VEXORA home"><span className="admin-brand-mark">V</span><span>VEXORA</span></a>
          <span className="admin-kicker">CONTROL CENTER · 01</span>
          <h1>{tr("مساحة الإدارة", "Admin workspace")}</h1>
          <p>{tr("إدارة متجرك الرقمي من مكان واحد، بأمان ووضوح.", "Manage your digital store in one secure, focused workspace.")}</p>
          <form onSubmit={signIn} className="admin-login-form">
            <label htmlFor="admin-password">{tr("كلمة مرور الإدارة", "Admin password")}</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••••••" />
            {error && <div className="admin-alert" role="alert">{error}</div>}
            <button className="admin-primary" type="submit" disabled={busy || !password}>{busy ? tr("جارٍ التحقق…", "Verifying…") : tr("دخول آمن", "Secure sign in")} <span aria-hidden="true">↗</span></button>
          </form>
          <a className="admin-back-link" href="/">{tr("العودة إلى المتجر", "Back to store")}</a>
        </section>
        <div className="admin-login-art" aria-hidden="true"><div className="admin-orbit orbit-one"/><div className="admin-orbit orbit-two"/><span>V</span><small>BLACK · GOLD · DIGITAL</small></div>
      </main>
    );
  }

  return (
    <main className="vex-admin" dir={ar ? "rtl" : "ltr"}>
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="VEXORA home"><span className="admin-brand-mark">V</span><span>VEXORA</span></a>
        <div className="admin-side-label">{tr("مساحة العمل", "WORKSPACE")}</div>
        <nav className="admin-nav" aria-label={tr("التنقل الإداري", "Admin navigation")}>
          {sections.map((item) => <button key={item.id} className={section === item.id ? "is-active" : ""} type="button" onClick={() => { setSection(item.id); setError(""); }}><span className="admin-nav-icon" aria-hidden="true">{item.icon}</span><span>{item[locale]}</span>{item.id === "orders" && openCount > 0 && <small>{openCount}</small>}</button>)}
        </nav>
        <div className="admin-sidebar-bottom"><span className="admin-secure-dot"/> {tr("اتصال آمن", "Secure session")}<button type="button" onClick={signOut}>{tr("تسجيل الخروج", "Sign out")} ↗</button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb"><a href="/">VEXORA</a><span>/</span><strong>{sectionTitle}</strong></div>
          <div className="admin-top-actions"><span className="admin-live"><i/> {tr("النظام يعمل", "SYSTEM ONLINE")}</span><button type="button" className="admin-locale" onClick={() => setLocale(ar ? "en" : "ar")}>{ar ? "EN" : "عربي"}</button><div className="admin-avatar">V</div></div>
        </header>

        <div className="admin-page-content">
          <div className="admin-page-heading"><div><span className="admin-kicker">VEXORA / {section.toUpperCase()}</span><h1>{sectionTitle}</h1><p>{tr("كل ما تحتاجه لإدارة متجرك، في مساحة هادئة ومنظمة.", "Everything you need to run your store, in one calm and organized space.")}</p></div><div className="admin-heading-actions"><a className="admin-outline" href="/" target="_blank" rel="noreferrer">{tr("عرض المتجر", "View store")} ↗</a></div></div>
          {error && <div className="admin-alert admin-alert-wide" role="alert">{error}</div>}
          {notice && <div className="admin-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label={tr("إغلاق", "Dismiss")}>×</button></div>}

          {section === "overview" && <>
            <div className="admin-stat-grid">
              <article className="admin-stat-card"><span>{tr("إجمالي الطلبات المعروضة", "Orders in recent view")}</span><strong>{orders.length}</strong><small>{tr("أحدث 60 طلباً كحد أقصى", "Up to the latest 60 orders")}</small><i>▤</i></article>
              <article className="admin-stat-card"><span>{tr("طلبات قيد المتابعة", "Orders in progress")}</span><strong>{openCount}</strong><small>{tr("لم تُسلّم أو تُلغَ بعد", "Not delivered or cancelled")}</small><i>◷</i></article>
              <article className="admin-stat-card"><span>{tr("إجمالي المنتجات", "Products")}</span><strong>{catalog?.products.length ?? "—"}</strong><small>{tr("حسب الكتالوج الحالي", "In the current catalog")}</small><i>◇</i></article>
              <article className="admin-stat-card admin-stat-highlight"><span>{tr("مبيعات الطلبات المسلّمة المعروضة", "Delivered sales in recent view")}</span><strong>{formatMoney(deliveredRevenue, locale)}</strong><small>{tr("محسوبة من الطلبات المعروضة فقط", "Calculated from the orders shown only")}</small><i>✦</i></article>
            </div>
            <div className="admin-overview-grid">
              <section className="admin-panel admin-recent-panel"><div className="admin-panel-heading"><div><span className="admin-kicker">LATEST ACTIVITY</span><h2>{tr("أحدث الطلبات", "Recent orders")}</h2></div><button className="admin-text-action" type="button" onClick={() => setSection("orders")}>{tr("كل الطلبات", "All orders")} ←</button></div>
                {orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{tr("الطلب", "Order")}</th><th>{tr("العميل", "Customer")}</th><th>{tr("الحالة", "Status")}</th><th>{tr("الإجمالي", "Total")}</th></tr></thead><tbody>{orders.slice(0, 5).map((order) => <tr key={order.number} onClick={() => { setSelectedNumber(order.number); setNextStatus(order.status); setSection("orders"); }}><td className="admin-order-id" dir="ltr">{order.number}</td><td>{order.customerName}</td><td><span className={`admin-status status-${order.status}`}>{localizedStatus(order.status, locale)}</span></td><td>{formatMoney(order.total, locale)}</td></tr>)}</tbody></table></div> : <div className="admin-empty"><span>◇</span><p>{tr("لا توجد طلبات بعد", "No orders yet")}</p></div>}
              </section>
              <section className="admin-panel admin-shortcuts"><div className="admin-panel-heading"><div><span className="admin-kicker">QUICK ACCESS</span><h2>{tr("وصول سريع", "Quick access")}</h2></div></div>{sections.filter((item) => item.id !== "overview").map((item) => <button className="admin-shortcut" key={item.id} type="button" onClick={() => setSection(item.id)}><span className="admin-shortcut-icon">{item.icon}</span><span>{item[locale]}<small>{item.id === "catalog" ? tr("تعديل المنتجات والأسعار", "Manage products and pricing") : item.id === "offers" ? tr("تحديث عروض المتجر", "Update store promotions") : item.id === "orders" ? tr("متابعة وتحديث الطلبات", "Review and update orders") : tr("معلومات المنصة", "Platform information")}</small></span><b>←</b></button>)}</section>
            </div>
          </>}

          {section === "orders" && <section className="admin-panel admin-orders-panel"><div className="admin-panel-heading"><div><span className="admin-kicker">ORDER MANAGEMENT</span><h2>{tr("إدارة الطلبات", "Manage orders")}</h2><p>{tr("تغيير الحالات يتبع مسار الطلب الحالي ويحافظ على سجل التحديثات والنقاط.", "Status changes follow the existing workflow and preserve order history and points.")}</p></div><button className="admin-outline" type="button" disabled={busy} onClick={() => { setBusy(true); void loadOrders().catch((reason) => setError(reason instanceof Error ? reason.message : "Error")).finally(() => setBusy(false)); }}>{tr("تحديث القائمة", "Refresh list")} ↻</button></div>
            <div className="admin-order-filters">{[["all", tr("الكل", "All")], ["received", localizedStatus("received", locale)], ["paid", localizedStatus("paid", locale)], ["processing", localizedStatus("processing", locale)], ["ready", localizedStatus("ready", locale)], ["delivered", localizedStatus("delivered", locale)], ["cancelled", localizedStatus("cancelled", locale)]].map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
            <div className="admin-orders-layout"><div className="admin-order-list">{visibleOrders.length ? visibleOrders.map((order) => <button type="button" key={order.number} className={`admin-order-card ${selectedNumber === order.number ? "is-selected" : ""}`} onClick={() => { setSelectedNumber(order.number); setNextStatus(order.status); setNote(""); }}><span className="admin-order-card-top"><strong dir="ltr">{order.number}</strong><span className={`admin-status status-${order.status}`}>{localizedStatus(order.status, locale)}</span></span><span className="admin-order-card-info">{order.customerName} · {order.phone}</span><span className="admin-order-card-bottom"><small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} {tr("عنصر", "items")}</small><b>{formatMoney(order.total, locale)}</b></span></button>) : <div className="admin-empty"><span>◇</span><p>{tr("لا توجد طلبات في هذا القسم", "No orders in this view")}</p></div>}</div>
              <div className="admin-order-detail">{selectedOrder ? <><div className="admin-detail-title"><div><span className="admin-kicker">ORDER DETAILS</span><h3 dir="ltr">{selectedOrder.number}</h3></div><span className={`admin-status status-${selectedOrder.status}`}>{localizedStatus(selectedOrder.status, locale)}</span></div><div className="admin-detail-facts"><div><span>{tr("اسم العميل", "Customer")}</span><strong>{selectedOrder.customerName}</strong></div><div><span>{tr("رقم الهاتف", "Phone")}</span><strong dir="ltr">{selectedOrder.phone}</strong></div><div><span>{tr("طريقة الدفع", "Payment")}</span><strong>{selectedOrder.paymentMethod}</strong></div><div><span>{tr("قيمة الطلب", "Order total")}</span><strong className="gold-text">{formatMoney(selectedOrder.total, locale)}</strong></div></div><h4>{tr("محتويات الطلب", "Order items")}</h4><div className="admin-detail-items">{selectedOrder.items.map((item, index) => <div key={`${selectedOrder.number}-${index}`}><span>{locale === "ar" ? item.productNameAr : item.productNameEn}</span><b>× {item.quantity}</b></div>)}</div><form className="admin-order-update" onSubmit={updateOrder}><label htmlFor="order-status">{tr("تحديث الحالة", "Update status")}</label><select id="order-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{[selectedOrder.status, ...(nextStatuses[selectedOrder.status] || [])].map((status) => <option value={status} key={status}>{localizedStatus(status, locale)}</option>)}</select><label htmlFor="order-note">{tr("ملاحظة للعميل (اختيارية)", "Customer note (optional)")}</label><input id="order-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={tr("أضف تحديثاً موجزاً…", "Add a short update…")}/><button className="admin-primary" type="submit" disabled={busy}>{busy ? tr("جارٍ الحفظ…", "Saving…") : tr("حفظ التحديث", "Save update")} <span>↗</span></button></form><button className="admin-danger-link" type="button" disabled={busy} onClick={() => void deleteData("order", selectedOrder.number)}>{tr("حذف هذا الطلب نهائياً", "Permanently delete this order")}</button></> : <div className="admin-empty"><span>▤</span><p>{tr("اختر طلباً لعرض التفاصيل", "Select an order to view details")}</p></div>}</div>
            </div>
          </section>}

          {(section === "catalog" || section === "offers") && <section className="admin-panel admin-catalog-panel"><div className="admin-panel-heading"><div><span className="admin-kicker">STORE MANAGEMENT</span><h2>{section === "offers" ? tr("العروض والتخفيضات", "Offers & discounts") : tr("كتالوج المتجر", "Store catalog")}</h2><p>{tr("تُحفظ التغييرات عبر واجهات الإدارة الحالية دون تغيير بنية البيانات.", "Changes use the existing admin API and data model.")}</p></div></div><AdminCatalog password={password} locale={locale} initialTab={section === "offers" ? "offers" : "products"} notify={setNotice} onSaved={(saved) => setCatalog(saved)}/></section>}

          {section === "settings" && <div className="admin-settings-grid"><section className="admin-panel"><span className="admin-kicker">PLATFORM</span><h2>{tr("إعدادات المنصة", "Platform settings")}</h2><p className="admin-settings-intro">{tr("ملخص الإعدادات الفعلية للنظام. لا نعرض عناصر تحكم غير مرتبطة بإعدادات محفوظة.", "A summary of active platform settings. No controls are shown for settings the system does not currently persist.")}</p><div className="admin-setting-row"><span className="admin-setting-symbol">◉</span><span><strong>{tr("صلاحية الإدارة", "Admin access")}</strong><small>{tr("محمية بكلمة مرور الخادم عبر واجهات الإدارة الحالية", "Protected by the server admin password on existing admin APIs")}</small></span><b>{tr("مفعّلة", "Active")}</b></div><div className="admin-setting-row"><span className="admin-setting-symbol">▤</span><span><strong>{tr("تخزين الكتالوج", "Catalog storage")}</strong><small>{tr("إعدادات الموقع الحالية في قاعدة البيانات", "Current site settings stored in the database")}</small></span><b>{catalog ? tr("متصل", "Connected") : tr("—", "—")}</b></div><div className="admin-setting-row"><span className="admin-setting-symbol">◇</span><span><strong>{tr("بيانات الصور", "Image data")}</strong><small>{tr("تُخزن مراجع الصور في الكتالوج ومحتواها في إعدادات الموقع", "Image references live in the catalog; image data uses site settings")}</small></span><b>{tr("الحالي", "Current")}</b></div></section><section className="admin-panel admin-data-tools"><span className="admin-kicker">DATA TOOLS</span><h2>{tr("إدارة البيانات", "Data management")}</h2><p>{tr("العمليات التالية موجودة مسبقاً. استخدمها بحذر؛ الحذف لا يمكن التراجع عنه.", "These existing actions are destructive and cannot be undone.")}</p><button className="admin-danger-button" type="button" disabled={busy} onClick={() => void deleteData("orders")}>{tr("حذف جميع الطلبات", "Delete all orders")}</button><button className="admin-danger-button" type="button" disabled={busy} onClick={() => void deleteData("points")}>{tr("تصفير نقاط العملاء", "Reset customer points")}</button><div className="admin-note">{tr("العروض وأكواد الخصم تُدار من قسم العروض. لا تتغير طرق الدفع أو إعدادات الدخول من هذه اللوحة.", "Manage offers and discount codes in Offers. Payment methods and sign-in configuration are not editable here.")}</div></section></div>}
        </div>
      </section>
    </main>
  );
}
