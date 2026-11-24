"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AdminTab = "overview" | "orders" | "catalog" | "inventory" | "recipes" | "customers" | "settings";
const TOKEN_KEY = "drinkeaze_admin_token";

const ORDER_STATUSES = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;

async function apiReq<T = any>(route: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/backend/${route.replace(/^\//, "")}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }
  if (!res.ok) {
    const msg = Array.isArray(parsed?.message) ? parsed.message.join(" ") : parsed?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function AdminDashboardPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderLimit] = useState<number>(15);
  const [orderPagination, setOrderPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedOrderDetail, setExpandedOrderDetail] = useState<any>(null);
  const [loadingOrderDetailId, setLoadingOrderDetailId] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [editIngName, setEditIngName] = useState("");
  const [editIngReorder, setEditIngReorder] = useState("0");
  const [editIngSupplier, setEditIngSupplier] = useState("");
  const [movementsIngId, setMovementsIngId] = useState<string | null>(null);
  const [movementsData, setMovementsData] = useState<any[]>([]);

  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [elapsedSec, setElapsedSec] = useState(5048);
  const [timerRunning, setTimerRunning] = useState(true);

  const [newCatName, setNewCatName] = useState("");
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategoryId, setNewProdCategoryId] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("450");
  const [newProdVariantName, setNewProdVariantName] = useState("Regular");

  const [ingName, setIngName] = useState("");
  const [ingUnit, setIngUnit] = useState("kg");
  const [ingQty, setIngQty] = useState("0");
  const [ingReorder, setIngReorder] = useState("0.5");

  const [purchaseIngId, setPurchaseIngId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseUnit, setPurchaseUnit] = useState("kg");

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [recipeData, setRecipeData] = useState<any>(null);
  const [recipeIngId, setRecipeIngId] = useState("");
  const [recipeQty, setRecipeQty] = useState("100");
  const [recipeUnit, setRecipeUnit] = useState("g");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        if (token) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [token]);

  const notify = (msg: string) => {
    setToast(msg);
    setErrorMsg(null);
    window.setTimeout(() => setToast(null), 4000);
  };

  const fail = (err: unknown) => {
    setErrorMsg(err instanceof Error ? err.message : "Operation failed.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await apiReq<{ accessToken: string }>("admin-auth/login", "", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setToken(data.accessToken);
      sessionStorage.setItem(TOKEN_KEY, data.accessToken);
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      if (activeTab === "overview") {
        const [ov, ordRes, prods] = await Promise.all([
          apiReq("admin/overview", token),
          apiReq("orders/admin?limit=10", token).catch(() => ({ data: [] })),
          apiReq("products", token).catch(() => []),
        ]);
        setOverview(ov);
        setOrders(Array.isArray(ordRes) ? ordRes : ordRes?.data ?? ordRes?.orders ?? []);
        setProducts(Array.isArray(prods) ? prods : []);
      } else if (activeTab === "orders") {
        const params = new URLSearchParams();
        params.set("page", String(orderPage));
        params.set("limit", String(orderLimit));
        if (orderStatusFilter !== "ALL") params.set("status", orderStatusFilter);
        const res = await apiReq(`orders/admin?${params.toString()}`, token);
        setOrders(Array.isArray(res) ? res : res?.data ?? res?.orders ?? []);
        setOrderPagination(res?.pagination ?? null);
      } else if (activeTab === "catalog") {
        const [cats, prods] = await Promise.all([apiReq("categories", token), apiReq("products", token)]);
        const cList = Array.isArray(cats) ? cats : [];
        setCategories(cList);
        setProducts(Array.isArray(prods) ? prods : []);
        if (!newProdCategoryId && cList[0]?.id) setNewProdCategoryId(cList[0].id);
      } else if (activeTab === "inventory" || activeTab === "recipes") {
        const [ings, prods, lowRes] = await Promise.all([
          apiReq("inventory/ingredients", token),
          apiReq("products", token),
          apiReq("inventory/low-stock", token).catch(() => []),
        ]);
        const iList = Array.isArray(ings) ? ings : [];
        const pList = Array.isArray(prods) ? prods : [];
        setIngredients(iList);
        setLowStockList(Array.isArray(lowRes) ? lowRes : lowRes?.data ?? lowRes?.ingredients ?? []);
        setProducts(pList);
        if (!purchaseIngId && iList[0]?.id) setPurchaseIngId(iList[0].id);
        if (!recipeIngId && iList[0]?.id) setRecipeIngId(iList[0].id);
        const vId = selectedVariantId || pList[0]?.variants?.[0]?.id || "";
        if (vId) {
          setSelectedVariantId(vId);
          setRecipeData(await apiReq(`recipes/variants/${encodeURIComponent(vId)}/ingredients`, token));
        }
      } else if (activeTab === "customers") {
        const res = await apiReq("admin/customers", token);
        setCustomers(res?.customers ?? []);
      } else if (activeTab === "settings") {
        setSettings(await apiReq("admin/settings", token));
      }
    } catch (err) {
      fail(err);
    }
  }, [
    token,
    activeTab,
    orderPage,
    orderLimit,
    orderStatusFilter,
    newProdCategoryId,
    purchaseIngId,
    recipeIngId,
    selectedVariantId,
  ]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const toggleOrderDetails = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setExpandedOrderDetail(null);
      return;
    }
    setExpandedOrderId(orderId);
    setExpandedOrderDetail(null);
    setLoadingOrderDetailId(orderId);
    try {
      const detail = await apiReq(`orders/admin/${encodeURIComponent(orderId)}`, token);
      setExpandedOrderDetail(detail);
    } catch (err) {
      fail(err);
    } finally {
      setLoadingOrderDetailId(null);
    }
  };

  const toggleIngredientMovements = async (ingId: string) => {
    if (movementsIngId === ingId) {
      setMovementsIngId(null);
      setMovementsData([]);
      return;
    }
    setMovementsIngId(ingId);
    try {
      const res = await apiReq(`inventory/ingredients/${encodeURIComponent(ingId)}/movements`, token);
      setMovementsData(Array.isArray(res) ? res : res?.movements ?? res?.data ?? []);
    } catch (err) {
      fail(err);
    }
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    if (!q) return orders;
    return orders.filter((o: any) =>
      [o.orderNumber, o.customerName, o.customerPhone, o.deliveryCity, o.status, o.paymentStatus]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [orders, q]);

  const filteredIngredients = useMemo(() => {
    if (!q) return ingredients;
    return ingredients.filter((i: any) => String(i.name || "").toLowerCase().includes(q));
  }, [ingredients, q]);

  const filteredCustomers = useMemo(() => {
    if (!q) return customers;
    return customers.filter((c: any) =>
      [c.name, c.phone, c.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [customers, q]);

  const isLowStockIngredient = (ing: any): boolean => {
    if (lowStockList.some((ls: any) => ls.id === ing.id || ls.ingredientId === ing.id)) {
      return true;
    }
    const qty = Number(ing.inventory?.quantity ?? 0);
    const reorder = Number(ing.inventory?.reorderLevel ?? ing.reorderLevel ?? 0);
    return reorder > 0 && qty <= reorder;
  };

  const handleExportSummary = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      overview,
      ordersCount: orders.length,
      productsCount: products.length,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drinkeaze-operations-report.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Operations report exported");
  };

  if (!token) {
    return (
    <div className="min-h-screen bg-[#f4f5f6] flex items-center justify-center px-4 py-16" style={{ zoom: 0.93 }}>
        <div className="w-full max-w-md rounded-[28px] bg-white border border-slate-200/80 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-[#48CAE4] flex items-center justify-center text-white font-bold text-lg">
              D
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-slate-900">Drinkeaze</h1>
              <p className="text-xs text-slate-500">Cloud Kitchen Operations Portal</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Sign in to manage orders, menu catalog, stock levels, recipes, customers, and store settings.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@drinkeaze.pk"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#48CAE4]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#48CAE4]/30"
              />
            </div>
            {authError && (
              <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-sm transition"
            >
              {authLoading ? "Signing in…" : "Sign in to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const menuNav: Array<{ id: AdminTab; label: string; badge?: string }> = [
    { id: "overview", label: "Dashboard" },
    { id: "orders", label: "Orders", badge: orders.length > 0 ? String(orderPagination?.total ?? orders.length) : undefined },
    { id: "catalog", label: "Menu" },
    { id: "inventory", label: "Stock" },
    { id: "recipes", label: "Recipes" },
    { id: "customers", label: "Customers" },
  ];

  const generalNav: Array<{ id: AdminTab; label: string }> = [
    { id: "settings", label: "Settings" },
  ];

  const totalOrdersCount = Number(overview?.orders?.total ?? orderPagination?.total ?? orders.length ?? 0);
  const completedOrdersCount = Number(
    overview?.orders?.completed ?? orders.filter((o: any) => o.status === "COMPLETED").length ?? 0
  );
  const activeOrdersCount = Number(
    overview?.orders?.active ??
      orders.filter((o: any) => !["COMPLETED", "CANCELLED"].includes(o.status)).length ??
      0
  );
  const paidRevenue = Number(overview?.revenue?.totalSales ?? 0);
  const lowStockCount = Number(overview?.inventory?.lowStockIngredients ?? lowStockList.length ?? 0);
  const fulfillmentPct =
    totalOrdersCount > 0 ? Math.min(100, Math.round((completedOrdersCount / totalOrdersCount) * 100)) : 41;

  const weekDays = [
    { day: "S", value: 42, active: false },
    { day: "M", value: 68, active: true },
    { day: "T", value: 56, active: true },
    { day: "W", value: 86, active: true },
    { day: "T", value: 64, active: false },
    { day: "F", value: 52, active: false },
    { day: "S", value: 60, active: false },
  ];

  const nextActionOrder =
    orders.find((o: any) => !["COMPLETED", "CANCELLED"].includes(o.status)) ?? orders[0] ?? null;

  const topVariants = products
    .flatMap((p: any) =>
      p.variants && p.variants.length > 0
        ? p.variants.map((v: any) => ({
            id: v.id,
            title: `${p.name} — ${v.name}`,
            subtitle: `PKR ${Number(v.price ?? 0).toLocaleString()}`,
          }))
        : [
            {
              id: p.id,
              title: p.name,
              subtitle: p.category?.name ?? "Menu item",
            },
          ]
    )
    .slice(0, 5);

  const stripeBg = {
    backgroundImage:
      "repeating-linear-gradient(-45deg, #cbd5e1, #cbd5e1 2px, transparent 2px, transparent 7px)",
  };

  const gaugeRadius = 74;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeDashOffset = gaugeCircumference * (1 - fulfillmentPct / 100);

  return (
    <div className="min-h-screen bg-[#f4f5f6] text-slate-900 p-2 sm:p-4 lg:p-6">
      <div className="max-w-[1440px] mx-auto rounded-[28px] bg-[#f8f9fa] border border-slate-200/70 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[820px]">
        <aside className="w-full lg:w-60 shrink-0 bg-[#f5f6f7] border-b lg:border-b-0 lg:border-r border-slate-200/70 flex flex-col justify-between py-6">
          <div>
            <div className="px-6 mb-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="flex items-center gap-2.5 text-left"
              >
                <span className="h-8 w-8 rounded-full bg-[#48CAE4] text-slate-950 flex items-center justify-center font-bold text-base shadow-sm">
                  D
                </span>
                <span className="font-display font-bold text-lg tracking-tight text-slate-900">
                  Drinkeaze
                </span>
              </button>
            </div>

            <div className="mb-6">
              <p className="px-6 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Menu
              </p>
              <nav className="space-y-1">
                {menuNav.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`relative w-full flex items-center justify-between px-6 py-2.5 text-sm transition ${
                        isActive
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-200/40"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#48CAE4]" />
                      )}
                      <span className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-[#48CAE4]" : "bg-slate-300"
                          }`}
                        />
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#48CAE4] text-slate-950">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div>
              <p className="px-6 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                General
              </p>
              <nav className="space-y-1">
                {generalNav.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`relative w-full flex items-center gap-3 px-6 py-2.5 text-sm transition ${
                        isActive
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-200/40"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#48CAE4]" />
                      )}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-[#48CAE4]" : "bg-slate-300"
                        }`}
                      />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setToken("");
                    sessionStorage.removeItem(TOKEN_KEY);
                  }}
                  className="w-full flex items-center gap-3 px-6 py-2.5 text-[15px] font-medium text-slate-500 hover:text-red-600 hover:bg-slate-200/40 transition"
                >
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  Logout
                </button>
              </nav>
            </div>
          </div>

          <div className="px-4 mt-8">
            <div className="rounded-2xl bg-gradient-to-br from-[#0c2d38] via-[#135c3a] to-[#071a22] p-4 text-white shadow-sm">
              <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center text-sm font-bold mb-3">
                ⚡
              </div>
              <p className="font-display font-semibold text-sm leading-snug">
                Karachi Kitchen Live Mode
              </p>
              <p className="text-[11px] text-cyan-100/80 mt-1">
                Real-time orders, stock & recipe costing
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className="mt-3 w-full py-2 rounded-full bg-[#48CAE4] hover:bg-[#48CAE4] text-slate-950 text-sm font-semibold transition"
              >
                Open Live Orders
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
<main className="flex-1 p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                  {menuNav.find((m) => m.id === activeTab)?.label ??
                    generalNav.find((g) => g.id === activeTab)?.label ??
                    "Dashboard"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Monitor orders, menu items, stock, and kitchen operations with ease.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                  className="px-4 py-2.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                  + Add Menu Item
                </button>
                <button
                  type="button"
                  onClick={handleExportSummary}
                  className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold transition"
                >
                  Export Data
                </button>
              </div>
            </div>

            {toast && (
              <div className="rounded-2xl bg-cyan-50 border border-cyan-200 px-4 py-3 text-sm text-emerald-800">
                {toast}
              </div>
            )}
            {errorMsg && (
              <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-[22px] bg-gradient-to-br from-[#1e6f84] via-[#155466] to-[#0d4d30] p-5 text-white shadow-sm flex flex-col justify-between min-h-[146px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cyan-50">Paid Revenue</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="h-8 w-8 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold hover:scale-105 transition"
                    aria-label="View orders"
                  >
                    ↗
                  </button>
                </div>
                <div className="my-2 font-display font-bold text-2xl sm:text-3xl tracking-tight">
                  PKR {paidRevenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-cyan-100/90">
                  <span className="px-1.5 py-0.5 rounded bg-white/15 text-[11px] font-medium">
                    Live
                  </span>
                  <span>Updated from kitchen orders</span>
                </div>
              </div>

              <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col justify-between min-h-[146px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total Orders</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="h-8 w-8 rounded-full bg-[#f8f9fa] border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 transition"
                    aria-label="Go to orders"
                  >
                    ↗
                  </button>
                </div>
                <div className="my-2 font-display font-bold text-3xl text-slate-900">
                  {totalOrdersCount}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="px-1.5 py-0.5 rounded border border-cyan-200 bg-cyan-50 text-[#48CAE4] text-[11px] font-semibold">
                    {activeOrdersCount} active
                  </span>
                  <span>In pipeline</span>
                </div>
              </div>

              <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col justify-between min-h-[146px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Completed Orders</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="h-8 w-8 rounded-full bg-[#f8f9fa] border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 transition"
                    aria-label="Completed orders"
                  >
                    ↗
                  </button>
                </div>
                <div className="my-2 font-display font-bold text-3xl text-slate-900">
                  {completedOrdersCount}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="px-1.5 py-0.5 rounded border border-cyan-200 bg-cyan-50 text-[#48CAE4] text-[11px] font-semibold">
                    {fulfillmentPct}%
                  </span>
                  <span>Fulfillment rate</span>
                </div>
              </div>

              <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col justify-between min-h-[146px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Low Stock Items</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("inventory")}
                    className="h-8 w-8 rounded-full bg-[#f8f9fa] border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold hover:bg-slate-100 transition"
                    aria-label="Go to stock"
                  >
                    ↗
                  </button>
                </div>
                <div className="my-2 font-display font-bold text-3xl text-slate-900">
                  {lowStockCount}
                </div>
                <div className="text-xs text-slate-400">
                  {Number(overview?.inventory?.outOfStockIngredients ?? 0)} out of stock
                </div>
              </div>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-6 rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display font-semibold text-base text-slate-900">
                        Kitchen Analytics
                      </h2>
                      <span className="text-xs text-slate-400">Weekly throughput</span>
                    </div>
                    <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 pt-4">
                      {weekDays.map((d, idx) => (
                        <div key={idx} className="flex flex-col items-center h-full justify-end gap-2">
                          <div className="w-full max-w-[38px] flex-1 flex items-end justify-center">
                            <div
                              style={{
                                height: `${d.value}%`,
                                ...(d.active ? {} : stripeBg),
                              }}
                              className={`w-full rounded-full transition-all ${
                                d.active
                                  ? idx === 3
                                    ? "bg-[#48CAE4]"
                                    : idx === 1
                                    ? "bg-[#38a169]"
                                    : "bg-[#68d391]"
                                  : "border border-slate-200/80"
                              }`}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-3 rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col justify-between">
                    <div>
                      <h2 className="font-display font-semibold text-base text-slate-900 mb-3">
                        Active Dispatch
                      </h2>
                      {nextActionOrder ? (
                        <>
                          <p className="font-semibold text-sm text-[#48CAE4] leading-snug">
                            Order {nextActionOrder.orderNumber} · {nextActionOrder.customerName}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Status: {nextActionOrder.status} · PKR{" "}
                            {Number(nextActionOrder.total ?? 0).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-[#48CAE4] leading-snug">
                            All kitchen queues clear
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Ready for incoming Karachi orders
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("orders")}
                      className="mt-5 w-full py-2.5 px-4 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <span>▶</span> Manage Orders
                    </button>
                  </div>

                  <div className="lg:col-span-3 rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-display font-semibold text-base text-slate-900">
                        Menu Items
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("catalog")}
                        className="px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + New
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {topVariants.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">
                          No menu items loaded yet.
                        </p>
                      ) : (
                        topVariants.map((item) => (
                          <div key={item.id} className="flex items-start gap-2.5">
                            <span className="mt-1 h-2.5 w-2.5 rounded-sm bg-[#48CAE4]/80 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-5 rounded-[22px] bg-white border border-slate-200/80 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-display font-semibold text-base text-slate-900">
                        Recent Orders
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("orders")}
                        className="px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {filteredOrders.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          No orders found yet.
                        </p>
                      ) : (
                        filteredOrders.slice(0, 4).map((o: any, i: number) => {
                          const badges = [
                            "bg-cyan-50 text-[#48CAE4]",
                            "bg-amber-50 text-amber-700",
                            "bg-rose-50 text-rose-700",
                          ];
                          return (
                            <div
                              key={o.id}
                              className="flex items-center justify-between gap-2 py-1"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-cyan-100 text-[#48CAE4] font-bold text-xs flex items-center justify-center shrink-0">
                                  {(o.customerName || "C").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {o.customerName} · {o.orderNumber}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    PKR {Number(o.total ?? 0).toLocaleString()} · {o.deliveryCity}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                                  badges[i % badges.length]
                                }`}
                              >
                                {o.status}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-4 rounded-[22px] bg-white border border-slate-200/80 p-5 flex flex-col items-center justify-between">
                    <div className="w-full flex items-center justify-between">
                      <h2 className="font-display font-semibold text-base text-slate-900">
                        Order Progress
                      </h2>
                    </div>
                    <div className="relative flex flex-col items-center justify-center my-2">
                      <svg width="180" height="98" viewBox="0 0 180 98" className="overflow-visible">
                        <path
                          d="M 16 90 A 74 74 0 0 1 164 90"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="16"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 16 90 A 74 74 0 0 1 164 90"
                          fill="none"
                          stroke="#48CAE4"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeDashOffset}
                        />
                      </svg>
                      <div className="text-center -mt-10">
                        <p className="font-display font-bold text-2xl text-slate-900">
                          {fulfillmentPct}%
                        </p>
                        <p className="text-[11px] text-[#48CAE4] font-medium">Orders Completed</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#48CAE4]" /> Completed
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#38a169]" /> Active
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-300" /> Pending
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-3 rounded-[22px] bg-gradient-to-br from-[#0e3a26] via-[#125436] to-[#092116] p-5 text-white flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-cyan-100">Shift Timer</span>
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    </div>
                    <div className="my-4 font-display font-bold text-3xl tracking-wider text-center">
                      {formatDuration(elapsedSec)}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTimerRunning((r) => !r)}
                        aria-label={timerRunning ? "Pause timer" : "Resume timer"}
                        className="h-9 w-9 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold hover:scale-105 transition"
                      >
                        {timerRunning ? "❚❚" : "▶"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimerRunning(false);
                          setElapsedSec(0);
                        }}
                        aria-label="Reset timer"
                        className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold hover:scale-105 transition"
                      >
                        ■
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-4 text-sm">
                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap gap-1.5">
                    {ORDER_STATUSES.map((st) => {
                      const active = orderStatusFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setOrderStatusFilter(st);
                            setOrderPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                            active
                              ? "bg-[#48CAE4] text-slate-950"
                              : "bg-[#f8f9fa] text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                  {orderPagination && (
                    <span className="text-xs text-slate-500">
                      Showing page {orderPagination.page} of {Math.max(1, orderPagination.totalPages)} ({orderPagination.total} total)
                    </span>
                  )}
                </div>

                {filteredOrders.length === 0 ? (
                  <p className="text-slate-400 py-8 text-center">No orders found yet.</p>
                ) : (
                  filteredOrders.map((o: any) => {
                    const nextStatusMap: Record<string, { next: string; label: string }> = {
                      PENDING: { next: "CONFIRMED", label: "Confirm" },
                      CONFIRMED: { next: "PREPARING", label: "Start Preparing" },
                      PREPARING: { next: "READY", label: "Mark Ready" },
                      READY: { next: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
                      OUT_FOR_DELIVERY: { next: "COMPLETED", label: "Complete" },
                    };
                    const step = nextStatusMap[o.status];
                    const canCollectCod =
                      o.paymentMethod === "CASH_ON_DELIVERY" &&
                      o.paymentStatus === "UNPAID" &&
                      (o.status === "OUT_FOR_DELIVERY" || o.status === "COMPLETED");
                    const canCancel =
                      (o.status === "PENDING" || o.status === "CONFIRMED") &&
                      (o.paymentStatus === "UNPAID" || o.paymentStatus === "FAILED");
                    const isExpanded = expandedOrderId === o.id;

                    return (
                      <div
                        key={o.id}
                        className="py-3.5 border-b border-slate-100 last:border-b-0 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div>
                              <span className="font-semibold text-slate-900">{o.orderNumber}</span> ·{" "}
                              {o.customerName} ({o.customerPhone}) ·{" "}
                              <span className="font-semibold text-[#48CAE4]">
                                PKR {Number(o.total).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {o.deliveryAddress}, {o.deliveryCity} · {o._count?.items ?? 0} item(s) ·
                              Status: <span className="font-medium text-slate-700">{o.status}</span> ·
                              Payment:{" "}
                              <span className="font-medium text-slate-700">
                                {o.paymentMethod} / {o.paymentStatus}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleOrderDetails(o.id)}
                              className="px-3 py-1.5 rounded-full bg-[#f8f9fa] hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                            >
                              {isExpanded ? "Hide Items" : "Items & History"}
                            </button>
                            {step && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await apiReq(
                                      `orders/admin/${encodeURIComponent(o.id)}/status`,
                                      token,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({ status: step.next }),
                                      }
                                    );
                                    notify(`Order moved to ${step.next}`);
                                    loadData();
                                  } catch (e) {
                                    fail(e);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 text-xs font-semibold transition"
                              >
                                {step.label}
                              </button>
                            )}
                            {canCollectCod && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await apiReq(
                                      `orders/admin/${encodeURIComponent(o.id)}/collect-cod`,
                                      token,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({}),
                                      }
                                    );
                                    notify("COD payment collected");
                                    loadData();
                                  } catch (e) {
                                    fail(e);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                              >
                                Collect COD
                              </button>
                            )}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await apiReq(
                                      `orders/admin/${encodeURIComponent(o.id)}/cancel`,
                                      token,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({}),
                                      }
                                    );
                                    notify("Order cancelled and stock restored");
                                    loadData();
                                  } catch (e) {
                                    fail(e);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="rounded-2xl bg-[#f8f9fa] border border-slate-200/80 p-4 text-xs space-y-2">
                            {loadingOrderDetailId === o.id ? (
                              <p className="text-slate-400">Loading order items & history…</p>
                            ) : expandedOrderDetail ? (
                              <>
                                {expandedOrderDetail.notes && (
                                  <p className="text-slate-600">
                                    <span className="font-semibold text-slate-800">Delivery Note:</span>{" "}
                                    {expandedOrderDetail.notes}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-800">Line Items</p>
                                  {(expandedOrderDetail.items ?? []).map((item: any) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-b-0"
                                    >
                                      <span>
                                        {item.productName}{" "}
                                        {item.variantName ? `(${item.variantName})` : ""} ×{" "}
                                        <span className="font-semibold">{item.quantity}</span>
                                      </span>
                                      <span className="font-medium text-slate-800">
                                        PKR {Number(item.lineTotal ?? (Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0))).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {(expandedOrderDetail.statusHistory ?? []).length > 0 && (
                                  <div className="pt-1 text-[11px] text-slate-500">
                                    <span className="font-semibold text-slate-700">Timeline: </span>
                                    {expandedOrderDetail.statusHistory
                                      .map((h: any) => `${h.fromStatus} → ${h.toStatus}`)
                                      .join(" · ")}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {orderPagination && orderPagination.totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={orderPage <= 1}
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={orderPage >= orderPagination.totalPages}
                      onClick={() => setOrderPage((p) => Math.min(orderPagination.totalPages, p + 1))}
                      className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "catalog" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const slug = newCatName
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-");
                      await apiReq("categories", token, {
                        method: "POST",
                        body: JSON.stringify({ name: newCatName.trim(), slug }),
                      });
                      setNewCatName("");
                      notify("Category added");
                      loadData();
                    } catch (err) {
                      fail(err);
                    }
                  }}
                  className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-3"
                >
                  <h2 className="font-display font-semibold text-base text-slate-900">New Category</h2>
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-xs"
                  >
                    Add Category
                  </button>
                  <div className="pt-2 text-xs text-slate-500">
                    {categories.map((c: any) => c.name).join(" · ") || "No categories yet"}
                  </div>
                </form>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const slug = newProdName
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-");
                      await apiReq("products", token, {
                        method: "POST",
                        body: JSON.stringify({
                          name: newProdName.trim(),
                          slug,
                          bvid: slug,
                          categoryId: newProdCategoryId,
                          variants: [
                            {
                              name: newProdVariantName.trim() || "Regular",
                              price: Number(newProdPrice),
                              isDefault: true,
                            },
                          ],
                        }),
                      });
                      setNewProdName("");
                      notify("Product created");
                      loadData();
                    } catch (err) {
                      fail(err);
                    }
                  }}
                  className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-3"
                >
                  <h2 className="font-display font-semibold text-base text-slate-900">New Product</h2>
                  <input
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Product name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newProdCategoryId}
                      onChange={(e) => setNewProdCategoryId(e.target.value)}
                      required
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      required
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <input
                    value={newProdVariantName}
                    onChange={(e) => setNewProdVariantName(e.target.value)}
                    placeholder="Variant name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-xs"
                  >
                    Create Product
                  </button>
                </form>
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="space-y-5 text-sm">
                {ingredients.some(isLowStockIngredient) && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold">Low Stock Alert:</span>{" "}
                      {ingredients.filter(isLowStockIngredient).map((i: any) => i.name).join(", ")} at
                      or below reorder level.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await apiReq("inventory/ingredients", token, {
                            method: "POST",
                            body: JSON.stringify({
                              name: ingName.trim(),
                              unit: ingUnit,
                              quantity: Number(ingQty),
                              reorderLevel: Number(ingReorder),
                            }),
                          });
                          setIngName("");
                          notify("Ingredient added");
                          loadData();
                        } catch (err) {
                          fail(err);
                        }
                      }}
                      className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-3"
                    >
                      <h2 className="font-display font-semibold text-base text-slate-900">
                        New Ingredient
                      </h2>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={ingName}
                          onChange={(e) => setIngName(e.target.value)}
                          placeholder="Ingredient name"
                          required
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200"
                        />
                        <select
                          value={ingUnit}
                          onChange={(e) => setIngUnit(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                          <option value="unit">unit</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.001"
                          value={ingQty}
                          onChange={(e) => setIngQty(e.target.value)}
                          placeholder="Qty"
                          required
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                          type="number"
                          step="0.001"
                          value={ingReorder}
                          onChange={(e) => setIngReorder(e.target.value)}
                          placeholder="Reorder level"
                          required
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-xs"
                      >
                        Add Ingredient
                      </button>
                    </form>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await apiReq(
                            `inventory/ingredients/${encodeURIComponent(purchaseIngId)}/stock`,
                            token,
                            {
                              method: "PATCH",
                              body: JSON.stringify({
                                type: "IN",
                                quantity: Number(purchaseQty),
                                unit: purchaseUnit,
                                note: "Stock purchase",
                              }),
                            }
                          );
                          notify("Stock updated");
                          loadData();
                        } catch (err) {
                          fail(err);
                        }
                      }}
                      className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-3"
                    >
                      <h2 className="font-display font-semibold text-base text-slate-900">Stock In</h2>
                      <select
                        value={purchaseIngId}
                        onChange={(e) => setPurchaseIngId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {ingredients.map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.001"
                          value={purchaseQty}
                          onChange={(e) => setPurchaseQty(e.target.value)}
                          required
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200"
                        />
                        <select
                          value={purchaseUnit}
                          onChange={(e) => setPurchaseUnit(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                          <option value="unit">unit</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                      >
                        Record Stock In
                      </button>
                    </form>
                  </div>

                  <div className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-2.5">
                    <h2 className="font-display font-semibold text-base text-slate-900 mb-2">
                      Stock Levels
                    </h2>
                    {filteredIngredients.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No ingredients found.</p>
                    ) : (
                      filteredIngredients.map((i: any) => {
                        const low = isLowStockIngredient(i);
                        const isEditing = editingIngId === i.id;
                        const isShowingMovements = movementsIngId === i.id;
                        return (
                          <div
                            key={i.id}
                            className="py-3 border-b border-slate-100 last:border-b-0 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{i.name}</span>
                                {low && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                    Low Stock
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    low ? "text-amber-700" : "text-[#48CAE4]"
                                  }`}
                                >
                                  {Number(i.inventory?.quantity ?? 0)} {i.inventory?.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingIngId(null);
                                    } else {
                                      setEditingIngId(i.id);
                                      setEditIngName(i.name ?? "");
                                      setEditIngReorder(
                                        String(i.inventory?.reorderLevel ?? i.reorderLevel ?? 0)
                                      );
                                      setEditIngSupplier(i.supplierName ?? "");
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  {isEditing ? "Close" : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleIngredientMovements(i.id)}
                                  className="px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  {isShowingMovements ? "Hide Log" : "Log"}
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  try {
                                    await apiReq(
                                      `inventory/ingredients/${encodeURIComponent(i.id)}`,
                                      token,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          name: editIngName.trim(),
                                          reorderLevel: Number(editIngReorder),
                                          supplierName: editIngSupplier.trim() || undefined,
                                        }),
                                      }
                                    );
                                    setEditingIngId(null);
                                    notify("Ingredient updated");
                                    loadData();
                                  } catch (err) {
                                    fail(err);
                                  }
                                }}
                                className="p-3 rounded-xl bg-[#f8f9fa] border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
                              >
                                <input
                                  value={editIngName}
                                  onChange={(e) => setEditIngName(e.target.value)}
                                  placeholder="Name"
                                  required
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                />
                                <input
                                  type="number"
                                  step="0.001"
                                  value={editIngReorder}
                                  onChange={(e) => setEditIngReorder(e.target.value)}
                                  placeholder="Reorder level"
                                  required
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                />
                                <div className="flex gap-1.5">
                                  <input
                                    value={editIngSupplier}
                                    onChange={(e) => setEditIngSupplier(e.target.value)}
                                    placeholder="Supplier"
                                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                                  />
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 rounded-lg bg-[#48CAE4] text-slate-950 font-semibold"
                                  >
                                    Save
                                  </button>
                                </div>
                              </form>
                            )}

                            {isShowingMovements && (
                              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-slate-200/80 text-[11px] space-y-1">
                                {movementsData.length === 0 ? (
                                  <p className="text-slate-400">No stock movements recorded.</p>
                                ) : (
                                  movementsData.slice(0, 5).map((m: any, idx: number) => (
                                    <div key={m.id ?? idx} className="flex justify-between text-slate-600">
                                      <span>
                                        {m.type} · {m.note || m.reason || "Adjustment"}
                                      </span>
                                      <span className="font-semibold text-slate-800">
                                        {Number(m.quantity ?? 0)} {m.unit ?? ""}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "recipes" && (
              <div className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-4 text-sm">
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  {products.flatMap((p: any) =>
                    (p.variants ?? []).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {p.name} — {v.name}
                      </option>
                    ))
                  )}
                </select>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await apiReq(
                        `recipes/variants/${encodeURIComponent(selectedVariantId)}/ingredients`,
                        token,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            ingredientId: recipeIngId,
                            quantity: Number(recipeQty),
                            unit: recipeUnit,
                          }),
                        }
                      );
                      notify("Recipe updated");
                      loadData();
                    } catch (err) {
                      fail(err);
                    }
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <select
                    value={recipeIngId}
                    onChange={(e) => setRecipeIngId(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {ingredients.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.001"
                    value={recipeQty}
                    onChange={(e) => setRecipeQty(e.target.value)}
                    required
                    className="w-28 px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                  <select
                    value={recipeUnit}
                    onChange={(e) => setRecipeUnit(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="unit">unit</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-xs"
                  >
                    Add Ingredient
                  </button>
                </form>
                {recipeData?.costing && (
                  <div className="p-3.5 rounded-xl bg-[#f8f9fa] border border-slate-200/70 text-slate-700">
                    Cost: PKR {recipeData.costing.totalIngredientCost} · Max orderable:{" "}
                    {recipeData.costing.maxOrderableQuantity}
                  </div>
                )}
              </div>
            )}

            {activeTab === "customers" && (
              <div className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-2 text-sm">
                {filteredCustomers.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center">No customers found.</p>
                ) : (
                  filteredCustomers.map((c: any) => (
                    <div
                      key={c.customerKey}
                      className="flex justify-between py-2.5 border-b border-slate-100 last:border-b-0"
                    >
                      <span className="font-medium text-slate-800">
                        {c.name} ({c.phone})
                      </span>
                      <span className="font-semibold text-[#48CAE4]">
                        PKR {Number(c.totalSpent).toLocaleString()} ({c.totalOrders} orders)
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "settings" && settings && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const s = await apiReq("admin/settings", token, {
                      method: "PATCH",
                      body: JSON.stringify({
                        storeName: settings.storeName,
                        deliveryFee: Number(settings.deliveryFee),
                        codEnabled: Boolean(settings.codEnabled),
                        onlinePaymentEnabled: Boolean(settings.onlinePaymentEnabled),
                      }),
                    });
                    setSettings(s);
                    notify("Settings saved");
                  } catch (err) {
                    fail(err);
                  }
                }}
                className="rounded-[22px] bg-white border border-slate-200/80 p-6 space-y-3 max-w-lg text-sm"
              >
                <h2 className="font-display font-semibold text-base text-slate-900">
                  Store Settings
                </h2>
                <input
                  value={settings.storeName ?? ""}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
                <input
                  type="number"
                  step="0.01"
                  value={settings.deliveryFee ?? 0}
                  onChange={(e) => setSettings({ ...settings, deliveryFee: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-semibold text-xs"
                >
                  Save Settings
                </button>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
