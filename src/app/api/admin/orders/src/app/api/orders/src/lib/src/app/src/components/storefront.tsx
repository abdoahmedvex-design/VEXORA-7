"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  categories,
  copy,
  discountCodes,
  formatMoney,
  products,
  type CategoryId,
  type Locale,
  type Product,
} from "@/lib/store-data";

type CartItem = {
  key: string;
  productId: number;
  packageIndex: number;
  playerId: string;
  quantity: number;
};

type Confirmation = {
  number: string;
  phone: string;
  total: number;
  message: string;
  whatsappUrl: string;
};

type TrackedOrder = {
  number: string;
  status: string;
  total: number;
  paymentMethod: string;
  items: {
    productId: number;
    productNameAr: string;
    productNameEn: string;
    packageAr: string;
    packageEn: string;
    unitPrice: number;
    quantity: number;
    playerId?: string;
    image: string;
  }[];
  createdAt: string;
  updatedAt: string;
  events: { status: string; note: string | null; createdAt: string }[];
};

type AdminOrder = {
  number: string;
  customerName: string;
  phone: string;
  total: number;
  status: string;
  paymentMethod: string;
  items: TrackedOrder["items"];
  createdAt: string;
  updatedAt: string;
};

const statusSteps = ["received", "paid", "processing", "ready", "delivered"];
const nextStatuses: Record<string, string[]> = {
  received: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function statusText(status: string, locale: Locale) {
  const t = copy[locale];
  switch (status) {
    case "received": return t.stateReceived;
    case "paid": return t.statePaid;
    case "processing": return t.stateProcessing;
    case "ready": return t.stateReady;
    case "delivered": return t.stateDelivered;
    case "cancelled": return t.stateCancelled;
    default: return status;
  }
}

function formatDate(date: string, locale: Locale) {
  return new Date(date).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium", timeStyle: "short",
  });
}

function ProductCard({ product, locale, onOpen }: {
  product: Product;
  locale: Locale;
  onOpen: (product: Product) => void;
}) {
  const startingPrice = Math.min(...product.packages.map((item) => item.price));
  return (
    <button className="product-card" type="button" onClick={() => onOpen(product)} aria-label={product.name[locale]}>
      <span className="product-image">
        <Image src={product.image} alt={product.name[locale]} fill sizes="(max-width: 600px) 45vw, 180px" />
      </span>
      <span className="product-title">{product.name[locale]}</span>
      <span className="product-price">{formatMoney(startingPrice, locale)}+</span>
    </button>
  );
}

function Timeline({ order, locale }: { order: TrackedOrder; locale: Locale }) {
  const steps = order.status === "cancelled"
    ? statusSteps.filter((step) => order.events.some((event) => event.status === step)).concat("cancelled")
    : statusSteps;
  const currentIndex = steps.indexOf(order.status);
  return (
    <div className="timeline">
      {steps.map((step, index) => {
        const event = order.events.find((entry) => entry.status === step);
        const className = step === "cancelled" ? "is-cancelled" : index === currentIndex ? "is-current" : index < currentIndex ? "is-done" : "is-upcoming";
        return (
          <div className={`timeline-step ${className}`} key={step}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{statusText(step, locale)}</strong>
              {event && <div className="muted">{formatDate(event.createdAt, locale)}</div>}
              {event?.note && <div className="timeline-note">{event.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Storefront() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [activeTab, setActiveTab] = useState<CategoryId | "all">("all");
  const [openCategory, setOpenCategory] = useState<CategoryId | null>(null);
  const [modal, setModal] = useState<"product" | "cart" | "confirmation" | "admin" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPackage, setSelectedPackage] = useState(0);
  const [playerId, setPlayerId] = useState("");
  const [productError, setProductError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Vodafone Cash");
  const [checkoutError, setCheckoutError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [trackNumber, setTrackNumber] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackError, setTrackError] = useState("");
  const [tracking, setTracking] = useState(false);
  const [toast, setToast] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminOrders, setAdminOrders] = useState<AdminOrder[] | null>(null);
  const [adminSelectedNumber, setAdminSelectedNumber] = useState("");
  const [adminNextStatus, setAdminNextStatus] = useState("received");
  const [adminNote, setAdminNote] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

  const t = copy[locale];

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("vexora_cart") || "[]") as CartItem[];
      if (Array.isArray(storedCart)) {
        setCart(storedCart.filter((item) => {
          const product = products.find((entry) => entry.id === item?.productId);
          return !!product && Number.isInteger(item.packageIndex) && !!product.packages[item.packageIndex] &&
            Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20 &&
            typeof item.key === "string" && typeof item.playerId === "string";
        }));
      }
      if (localStorage.getItem("vexora_lang") === "en") setLocale("en");
    } catch { /* An unavailable or old local cart should not block shopping. */ }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) {
      localStorage.setItem("vexora_cart", JSON.stringify(cart));
      localStorage.setItem("vexora_lang", locale);
    }
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [cart, locale, cartReady]);

  useEffect(() => {
    if (!modal) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modal]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const cartDetails = useMemo(() => cart.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const chosen = product?.packages[item.packageIndex];
    return product && chosen ? [{ item, product, chosen }] : [];
  }), [cart]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartDetails.reduce((sum, line) => sum + line.chosen.price * line.item.quantity, 0);
  const coupon = appliedCode ? discountCodes[appliedCode] : undefined;
  const eligibleSubtotal = cartDetails.reduce((sum, line) =>
    sum + (!coupon?.category || coupon.category === line.product.category ? line.chosen.price * line.item.quantity : 0), 0);
  const discount = coupon ? Math.round(eligibleSubtotal * coupon.percent / 100) : 0;
  const total = subtotal - discount;
  const selectedOption = selectedProduct?.packages[selectedPackage] || selectedProduct?.packages[0];
  const selectedAdminOrder = adminOrders?.find((order) => order.number === adminSelectedNumber);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedPackage(0);
    setPlayerId("");
    setProductError("");
    setModal("product");
  }

  function addToCart() {
    if (!selectedProduct || !selectedOption) return;
    const id = playerId.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    if (selectedProduct.requiresPlayerId && !/^\d{5,14}$/.test(id)) {
      setProductError(t.playerIdError);
      return;
    }
    const key = `${selectedProduct.id}-${selectedPackage}-${id}`;
    setCart((previous) => {
      const existing = previous.find((item) => item.key === key);
      if (existing) return previous.map((item) => item.key === key ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item);
      return [...previous, { key, productId: selectedProduct.id, packageIndex: selectedPackage, playerId: id, quantity: 1 }];
    });
    setModal(null);
    setToast(locale === "ar" ? "تمت إضافة المنتج للسلة" : "Added to your cart");
  }

  function changeQuantity(key: string, amount: number) {
    setCart((previous) => previous.map((item) => item.key === key
      ? { ...item, quantity: Math.min(20, item.quantity + amount) } : item).filter((item) => item.quantity > 0));
  }

  function applyCoupon() {
    const value = couponInput.trim().toUpperCase();
    const found = discountCodes[value];
    if (!found) {
      setAppliedCode("");
      setCouponError(t.invalidCode);
      return;
    }
    if (found.category && !cartDetails.some((line) => line.product.category === found.category)) {
      setAppliedCode("");
      setCouponError(`${t.wrongCategory} ${categories.find((item) => item.id === found.category)?.name[locale] || ""}`);
      return;
    }
    setAppliedCode(value);
    setCouponError("");
    setToast(locale === "ar" ? "تم تطبيق كود الخصم" : "Discount code applied");
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = checkoutPhone.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[\s().-]/g, "");
    if (checkoutName.trim().length < 2 || !/^\+?\d{10,14}$/.test(normalizedPhone)) {
      setCheckoutError(t.required);
      return;
    }
    if (cartDetails.length === 0) return;
    setCheckoutError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: checkoutName, phone: checkoutPhone, email: checkoutEmail,
          paymentMethod, discountCode: appliedCode, locale,
          items: cartDetails.map(({ item }) => ({
            productId: item.productId, packageIndex: item.packageIndex,
            quantity: item.quantity, playerId: item.playerId,
          })),
        }),
      });
      const result = await response.json() as Confirmation & { error?: string };
      if (!response.ok) {
        setCheckoutError(response.status === 400 ? (result.error || t.required) : t.error);
        return;
      }
      setConfirmation(result);
      setTrackNumber(result.number);
      setTrackPhone(result.phone);
      setTrackedOrder(null);
      setCart([]);
      setAppliedCode("");
      setCouponInput("");
      setModal("confirmation");
    } catch {
      setCheckoutError(t.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trackNumber.trim() || !trackPhone.trim()) {
      setTrackError(t.trackMissing);
      setTrackedOrder(null);
      return;
    }
    setTrackError("");
    setTracking(true);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: trackNumber, phone: trackPhone }),
      });
      if (!response.ok) {
        setTrackError(response.status === 404 || response.status === 400 ? t.notFound : t.connectionError);
        setTrackedOrder(null);
        return;
      }
      const result = await response.json() as TrackedOrder;
      setTrackedOrder(result);
    } catch {
      setTrackError(t.connectionError);
      setTrackedOrder(null);
    } finally {
      setTracking(false);
    }
  }

  async function copyConfirmation() {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.message);
      setToast(t.copied);
    } catch {
      setToast(t.error);
    }
  }

  function goToTracking() {
    setModal(null);
    setTimeout(() => document.getElementById("tracking")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function loadAdminOrders() {
    setAdminBusy(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${adminPassword}` } });
      const result = await response.json() as { orders?: AdminOrder[]; error?: string };
      if (!response.ok) {
        setAdminError(result.error || t.error);
        return;
      }
      setAdminOrders(result.orders || []);
    } catch {
      setAdminError(t.connectionError);
    } finally {
      setAdminBusy(false);
    }
  }

  async function updateAdminOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdminOrder) return;
    setAdminBusy(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminPassword}`, "Content-Type": "application/json" },
        body: JSON.stringify({ number: selectedAdminOrder.number, status: adminNextStatus, note: adminNote }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setAdminError(result.error || t.error);
        return;
      }
      setAdminNote("");
      setToast(locale === "ar" ? "تم تحديث الطلب" : "Order updated");
      await loadAdminOrders();
    } catch {
      setAdminError(t.connectionError);
    } finally {
      setAdminBusy(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="VEXORA home">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M3 5h8l5 14 5-14h8L16 29z" fill="none" stroke="#D6B45B" strokeWidth="2" strokeLinejoin="round" />
            <path d="M11 5l5 14 5-14" fill="#D6B45B" opacity=".35" />
          </svg>
          <span>VEXORA</span>
        </a>
        <button className="pill-button header-button" type="button" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={locale === "ar" ? "Switch to English" : "التحويل إلى العربية"}>
          {locale === "ar" ? "EN" : "عربي"}
        </button>
        <button className="pill-button header-button cart-trigger" type="button" onClick={() => { setCheckoutError(""); setModal("cart"); }} aria-label={t.cart}>
          <span aria-hidden="true">🛒</span> <span>{cartCount}</span>
        </button>
      </header>

      <div id="top" className="hero">
        <h1>{t.tagline}</h1>
        <p>{t.subtitle}</p>
        <a className="gold-button" href="#store">{t.explore}</a>
      </div>

      <main>
        <section id="store" className="content-section store-section">
          <h2 className="section-title">{t.products}</h2>
          <div className="tabs" role="tablist" aria-label={t.products}>
            <button className={`pill-button ${activeTab === "all" ? "active" : ""}`} type="button" role="tab" aria-selected={activeTab === "all"} onClick={() => setActiveTab("all")}>{t.all}</button>
            {categories.map((category) => (
              <button key={category.id} className={`pill-button ${activeTab === category.id ? "active" : ""}`} type="button" role="tab" aria-selected={activeTab === category.id} onClick={() => setActiveTab(category.id)}>{category.name[locale]}</button>
            ))}
          </div>
          {activeTab === "all" ? (
            <div className="grouped-products">
              {categories.map((category) => {
                const categoryProducts = products.filter((product) => product.category === category.id);
                const isOpen = openCategory === category.id;
                return (
                  <div className={`category-section ${isOpen ? "open" : ""}`} key={category.id}>
                    <button type="button" className="category-heading" aria-expanded={isOpen} onClick={() => setOpenCategory(isOpen ? null : category.id)}>
                      <span>{category.icon} {category.name[locale]}</span>
                      <small>{categoryProducts.length}</small>
                      <span className="chevron" aria-hidden="true">▾</span>
                    </button>
                    <div className="category-body" aria-hidden={!isOpen}>
                      <div className="category-inner">
                        <div className="product-grid">
                          {categoryProducts.map((product) => <ProductCard key={product.id} product={product} locale={locale} onOpen={openProduct} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="product-grid filtered-products">
              {products.filter((product) => product.category === activeTab).map((product) =>
                <ProductCard key={product.id} product={product} locale={locale} onOpen={openProduct} />)}
            </div>
          )}
        </section>

        <section className="content-section why-section">
          <h2 className="section-title">{t.why}</h2>
          <div className="why-grid">
            <div className="feature-card"><strong>{t.authentic}</strong><p className="muted">{t.authenticDesc}</p></div>
            <div className="feature-card"><strong>{t.fast}</strong><p className="muted">{t.fastDesc}</p></div>
            <div className="feature-card"><strong>{t.local}</strong><p className="muted">{t.localDesc}</p></div>
          </div>
        </section>

        <section id="tracking" className="content-section tracking-section">
          <h2 className="section-title">{t.track}</h2>
          <form className="track-form" onSubmit={submitTracking}>
            <input value={trackNumber} onChange={(event) => setTrackNumber(event.target.value)} placeholder={t.orderNumber} aria-label={t.orderNumber} autoComplete="off" />
            <input value={trackPhone} onChange={(event) => setTrackPhone(event.target.value)} placeholder={t.phone} aria-label={t.phone} inputMode="tel" autoComplete="tel" />
            <button className="gold-button" type="submit" disabled={tracking}>{tracking ? t.loading : t.trackButton}</button>
          </form>
          {trackError && <div className="form-error track-error" role="alert">{trackError}</div>}
          {trackedOrder && (
            <div className="tracked-order">
              <div className="tracking-header">
                <div><span className="eyebrow">{t.trackStatus}</span><h3 dir="ltr">{trackedOrder.number}</h3></div>
                <span className={`status-badge ${trackedOrder.status === "cancelled" ? "cancelled" : ""}`}>{statusText(trackedOrder.status, locale)}</span>
              </div>
              <div className="tracking-facts">
                <div><span>{t.placedOn}</span><strong>{formatDate(trackedOrder.createdAt, locale)}</strong></div>
                <div><span>{t.total}</span><strong>{formatMoney(trackedOrder.total, locale)}</strong></div>
                <div><span>{t.paymentMethod}</span><strong>{trackedOrder.paymentMethod === "Bank transfer" ? t.bank : trackedOrder.paymentMethod}</strong></div>
              </div>
              <h4>{t.timeline}</h4>
              <Timeline order={trackedOrder} locale={locale} />
              <h4>{t.items}</h4>
              <div className="tracking-items">
                {trackedOrder.items.map((item, index) => (
                  <div className="tracking-item" key={`${item.productId}-${index}`}>
                    <Image src={item.image} alt="" width={54} height={36} />
                    <span>{locale === "ar" ? item.productNameAr : item.productNameEn} — {locale === "ar" ? item.packageAr : item.packageEn} × {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        © VEXORA – Digital Store · {t.tagline}<br />
        <a href="https://wa.me/201004063941" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <span> · </span>
        <button type="button" onClick={() => { setAdminError(""); setModal("admin"); }}>{t.admin}</button>
      </footer>

      {toast && <div className="toast on" role="status">{toast}</div>}

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          {modal === "product" && selectedProduct && (
            <div className="sheet product-sheet" role="dialog" aria-modal="true" aria-label={selectedProduct.name[locale]}>
              <button className="sheet-x" type="button" onClick={() => setModal(null)} aria-label={t.close}>×</button>
              <Image className="product-modal-image" src={selectedProduct.image} alt={selectedProduct.name[locale]} width={600} height={400} />
              <h2>{selectedProduct.name[locale]}</h2>
              <p className="muted product-description">{selectedProduct.description[locale]} · {t.delivery}: {selectedProduct.delivery[locale]} · {t.available}</p>
              <p className="choose-label">{t.choosePackage}</p>
              <div className="package-list">
                {selectedProduct.packages.map((option, index) => (
                  <button key={index} type="button" className={`pill-button package-option ${selectedPackage === index ? "active" : ""}`} onClick={() => { setSelectedPackage(index); setProductError(""); }}>
                    {option.label[locale]} — {formatMoney(option.price, locale)}
                  </button>
                ))}
              </div>
              {selectedProduct.requiresPlayerId && (
                <input className="field" value={playerId} onChange={(event) => { setPlayerId(event.target.value); setProductError(""); }} placeholder={t.playerId} aria-label={t.playerId} inputMode="numeric" />
              )}
              {productError && <div className="form-error" role="alert">{productError}</div>}
              <div className="product-modal-price">{selectedOption && formatMoney(selectedOption.price, locale)}</div>
              <div className="modal-actions">
                <button className="gold-button" type="button" onClick={addToCart}>{t.add}</button>
                <button className="pill-button" type="button" onClick={() => setModal(null)}>{t.close}</button>
              </div>
            </div>
          )}

          {modal === "cart" && (
            <div className="sheet cart-sheet" role="dialog" aria-modal="true" aria-label={t.cart}>
              <button className="sheet-x" type="button" onClick={() => setModal(null)} aria-label={t.close}>×</button>
              <h2>{t.cart}</h2>
              {cartDetails.length ? (
                <>
                  <div className="cart-lines">
                    {cartDetails.map(({ item, product, chosen }) => (
                      <div className="cart-row" key={item.key}>
                        <div className="cart-row-info">
                          <strong>{product.name[locale]} · {chosen.label[locale]}</strong>
                          <span className="muted">{item.playerId ? `ID: ${item.playerId} · ` : ""}{formatMoney(chosen.price, locale)}</span>
                        </div>
                        <div className="quantity-control">
                          <button type="button" aria-label="Decrease quantity" onClick={() => changeQuantity(item.key, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => changeQuantity(item.key, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="cart-summary-row"><span>{t.subtotal}</span><span>{formatMoney(subtotal, locale)}</span></div>
                  {discount > 0 && <div className="cart-summary-row"><span>{t.discount} ({coupon?.percent}%)</span><span>−{formatMoney(discount, locale)}</span></div>}
                  <div className="coupon-row">
                    <input className="field" value={couponInput} onChange={(event) => { setCouponInput(event.target.value); setCouponError(""); }} placeholder={t.discountCode} aria-label={t.discountCode} />
                    <button className="pill-button" type="button" onClick={applyCoupon}>{t.apply}</button>
                  </div>
                  {couponError && <div className="form-error" role="alert">{couponError}</div>}
                  <div className="cart-summary-row total-row"><strong>{t.total}</strong><strong>{formatMoney(total, locale)}</strong></div>
                  <form className="checkout-form" onSubmit={submitOrder}>
                    <input className="field" value={checkoutName} onChange={(event) => setCheckoutName(event.target.value)} placeholder={t.fullName} aria-label={t.fullName} autoComplete="name" />
                    <input className="field" value={checkoutPhone} onChange={(event) => setCheckoutPhone(event.target.value)} placeholder={t.phone} aria-label={t.phone} inputMode="tel" autoComplete="tel" />
                    <input className="field" value={checkoutEmail} onChange={(event) => setCheckoutEmail(event.target.value)} placeholder={t.email} aria-label={t.email} type="email" autoComplete="email" />
                    <select className="field" aria-label={t.payment} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                      <option value="Vodafone Cash">Vodafone Cash</option>
                      <option value="InstaPay">InstaPay</option>
                      <option value="Bank transfer">{t.bank}</option>
                    </select>
                    <div className="note">{t.paymentNote}</div>
                    {checkoutError && <div className="form-error" role="alert">{checkoutError}</div>}
                    <button className="gold-button" type="submit" disabled={submitting}>{submitting ? t.processing : t.placeOrder}</button>
                  </form>
                </>
              ) : (
                <div className="empty-cart">
                  <div aria-hidden="true">🛒</div>
                  <p>{t.emptyCart}</p>
                  <span className="muted">{t.emptyCartHelp}</span>
                  <button className="gold-button" type="button" onClick={() => { setModal(null); document.getElementById("store")?.scrollIntoView({ behavior: "smooth" }); }}>{t.continueShopping}</button>
                </div>
              )}
              <button className="pill-button bottom-close" type="button" onClick={() => setModal(null)}>{t.close}</button>
            </div>
          )}

          {modal === "confirmation" && confirmation && (
            <div className="sheet confirmation-sheet" role="dialog" aria-modal="true" aria-label={t.orderPlaced}>
              <button className="sheet-x" type="button" onClick={() => setModal(null)} aria-label={t.close}>×</button>
              <div className="success-icon" aria-hidden="true">✓</div>
              <h2>{t.orderPlaced}</h2>
              <p className="muted">{t.received}</p>
              <div className="confirmation-number" dir="ltr">{confirmation.number}</div>
              <div className="note">{t.paymentNote}</div>
              <p className="muted confirmation-hint">{t.trackHint}</p>
              <div className="confirmation-actions">
                <a className="gold-button" href={confirmation.whatsappUrl} target="_blank" rel="noopener noreferrer">💬 {t.whatsapp}</a>
                <button className="pill-button" type="button" onClick={copyConfirmation}>{t.copyMessage}</button>
                <button className="pill-button" type="button" onClick={goToTracking}>{t.track}</button>
              </div>
              <textarea className="field message-preview" value={confirmation.message} readOnly aria-label={t.orderDetails} />
            </div>
          )}

          {modal === "admin" && (
            <div className="sheet admin-sheet" role="dialog" aria-modal="true" aria-label={locale === "ar" ? "لوحة التحكم" : "Admin dashboard"}>
              <button className="sheet-x" type="button" onClick={() => setModal(null)} aria-label={t.close}>×</button>
              <h2>{locale === "ar" ? "لوحة التحكم" : "Admin dashboard"}</h2>
              {!adminOrders ? (
                <form className="admin-login" onSubmit={(event) => { event.preventDefault(); void loadAdminOrders(); }}>
                  <p className="muted">{locale === "ar" ? "أدخل كلمة مرور الإدارة لإدارة الطلبات." : "Enter your admin password to manage orders."}</p>
                  <input className="field" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder={locale === "ar" ? "كلمة المرور" : "Password"} aria-label="Admin password" autoComplete="current-password" dir="ltr" />
                  <button className="gold-button" type="submit" disabled={adminBusy}>{adminBusy ? t.loading : locale === "ar" ? "دخول" : "Sign in"}</button>
                </form>
              ) : (
                <div className="admin-content">
                  <p className="muted">{locale === "ar" ? "آخر الطلبات" : "Recent orders"}</p>
                  {adminOrders.length ? adminOrders.map((order) => (
                    <button type="button" key={order.number} className={`admin-order ${adminSelectedNumber === order.number ? "selected" : ""}`} onClick={() => { setAdminSelectedNumber(order.number); setAdminNextStatus(order.status); setAdminNote(""); setAdminError(""); }}>
                      <span><strong dir="ltr">{order.number}</strong><small>{order.customerName} · {order.phone}</small></span>
                      <span><strong>{formatMoney(order.total, locale)}</strong><small>{statusText(order.status, locale)}</small></span>
                    </button>
                  )) : <p className="muted">{locale === "ar" ? "لا توجد طلبات بعد." : "No orders yet."}</p>}
                  {selectedAdminOrder && (
                    <form className="admin-update" onSubmit={updateAdminOrder}>
                      <h3>{selectedAdminOrder.number}</h3>
                      <p className="muted">{selectedAdminOrder.items.map((item) => `${locale === "ar" ? item.productNameAr : item.productNameEn} × ${item.quantity}`).join("، ")}</p>
                      <select className="field" value={adminNextStatus} onChange={(event) => setAdminNextStatus(event.target.value)} aria-label={t.status}>
                        {[selectedAdminOrder.status, ...(nextStatuses[selectedAdminOrder.status] || [])].map((status) => <option value={status} key={status}>{statusText(status, locale)}</option>)}
                      </select>
                      <input className="field" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder={locale === "ar" ? "رسالة للعميل (اختياري)" : "Note for customer (optional)"} aria-label="Customer note" />
                      <button className="gold-button" type="submit" disabled={adminBusy}>{adminBusy ? t.loading : locale === "ar" ? "حفظ التحديث" : "Save update"}</button>
                    </form>
                  )}
                </div>
              )}
              {adminError && <div className="note admin-error" role="alert">{adminError}</div>}
              <button className="pill-button bottom-close" type="button" onClick={() => setModal(null)}>{t.close}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
