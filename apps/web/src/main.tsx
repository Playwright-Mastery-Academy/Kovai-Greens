import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  Link,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Sprout,
  LayoutDashboard,
  CalendarDays,
  Layers,
  Scissors,
  Package,
  ShoppingBag,
  Users,
  School,
  Repeat,
  Truck,
  Wallet,
  Receipt,
  BarChart3,
  ShieldCheck,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ArrowDownToLine,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  Leaf,
  MapPin,
  LogOut,
  Check,
  AlertCircle,
  RefreshCw,
  Link2,
  Box,
  History,
  LoaderCircle,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Sun,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  api,
  setToken,
  getBase,
  money,
  weight,
  date,
  title,
  csv,
  type Row,
} from "./api";
import {
  fields,
  names,
  singular,
  descriptions,
  columns,
  nextStates,
  type Field,
} from "./config";
import "./style.css";
const BusinessGrid = React.lazy(() => import("./BusinessGrid"));
const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 20000, refetchOnWindowFocus: false },
  },
});
type Context = {
  user: Row | null;
  connect: () => void;
  notify: (s: string) => void;
  authChanged: (r: Row | null) => void;
};
const Ctx = createContext<Context>({
  user: null,
  connect: () => {},
  notify: () => {},
  authChanged: () => {},
});
function useRows(resource: string, enabled = true) {
  const { user } = useContext(Ctx);
  return useQuery({
    queryKey: [resource],
    queryFn: () => api(resource + "?limit=500"),
    enabled: !!user && enabled,
  });
}
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + (value || "").toLowerCase()}>
      {title(value || "—")}
    </span>
  );
}
function Modal({
  title: heading,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      aria-label={heading}
    >
      <header>
        <h2>{heading}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
function Empty({
  heading,
  children,
  icon: Icon = Sprout,
}: {
  heading: string;
  children?: React.ReactNode;
  icon?: any;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h3>{heading}</h3>
      <p>{children}</p>
    </div>
  );
}
const groups = [
  {
    name: "OVERVIEW",
    items: [
      ["dashboard", "Overview", LayoutDashboard],
      ["planning", "Crop planning", CalendarDays],
    ],
  },
  {
    name: "FARM OPERATIONS",
    items: [
      ["batches", "Growing batches", Sprout],
      ["harvests", "Harvests", Scissors],
      ["inventory", "Inventory", Layers],
      ["products", "Products", Leaf],
      ["seed-lots", "Seeds & suppliers", Package],
    ],
  },
  {
    name: "BUSINESS",
    items: [
      ["orders", "Orders", ShoppingBag],
      ["customers", "Customers", Users],
      ["schools", "School programs", School],
      ["schedules", "Subscriptions", Repeat],
      ["packing", "Packing", Box],
      ["deliveries", "Deliveries", Truck],
    ],
  },
  {
    name: "FINANCE & INSIGHTS",
    items: [
      ["payments", "Payments", Wallet],
      ["expenses", "Expenses", Receipt],
      ["reports", "Reports", BarChart3],
      ["traceability", "Traceability", ShieldCheck],
    ],
  },
];
const rolePages: Record<string, string[]> = {
  PRODUCTION_MANAGER: [
    "dashboard",
    "planning",
    "products",
    "suppliers",
    "seed-lots",
    "batches",
    "harvests",
    "inventory",
    "movements",
    "packing",
    "orders",
    "traceability",
  ],
  FARM_WORKER: [
    "products",
    "batches",
    "harvests",
    "inventory",
    "packing",
    "orders",
  ],
  SALES: [
    "dashboard",
    "products",
    "customers",
    "orders",
    "schools",
    "schedules",
    "payments",
    "billing",
    "deliveries",
    "reports",
    "traceability",
  ],
  DELIVERY: ["deliveries"],
};
function App() {
  const [user, setUser] = useState<Row | null>(null),
    [connecting, setConnecting] = useState(false),
    [authReady, setAuthReady] = useState(false),
    [accountOpen, setAccountOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  const loc = useLocation();
  const path = loc.pathname.split("/")[1] || "dashboard";
  const health = useQuery({
    queryKey: ["health", getBase()],
    queryFn: () => api("health"),
    retry: false,
  });
  useEffect(() => {
    api("auth/refresh", { method: "POST" })
      .then((r) => {
        setToken(r.accessToken);
        setUser(r.user);
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const allowed = (p: string) =>
    !user ||
    ["OWNER", "ADMIN"].includes(user.role) ||
    rolePages[user.role]?.includes(p);
  const current =
    names[path] ||
    (
      {
        dashboard: "Overview",
        planning: "Crop planning",
        reports: "Reports",
        billing: "Monthly statements",
        traceability: "Traceability",
        settings: "Settings",
      } as Row
    )[path] ||
    "Overview";
  if (!authReady)
    return (
      <main className="login-page">
        <LoaderCircle className="spin" aria-label="Loading" />
      </main>
    );
  if (!user)
    return (
      <main className="login-page">
        <div className="login-brand">
          <Sprout size={38} />
          <h1>Kovai Greens</h1>
          <p>Fresh growth. Clear operations.</p>
        </div>
        <Connect
          onClose={() => {}}
          onLogin={(r) => {
            setToken(r.accessToken);
            setUser(r.user);
            qc.clear();
          }}
          standalone
        />
      </main>
    );
  return (
    <Ctx.Provider
      value={{
        user,
        connect: () => setConnecting(true),
        notify: setToast,
        authChanged: (r) => {
          setToken(r?.accessToken || "");
          setUser(r?.user || null);
          qc.clear();
        },
      }}
    >
      <div className="app">
        <aside className={menu ? "sidebar open" : "sidebar"}>
          <Link to="/" className="brand">
            <span className="brand-icon">
              <Sprout size={26} />
            </span>
            <span>
              Kovai<span className="brand-light">Greens</span>
              <small>FARM OPERATIONS</small>
            </span>
          </Link>
          <div className="farm">
            <span className="farm-avatar">KG</span>
            <span>
              <b>Coimbatore farm</b>
              <small>
                <MapPin size={11} /> Tamil Nadu, India
              </small>
            </span>
            <ChevronDown size={14} />
          </div>
          <nav>
            {groups.map((g) => (
              <div className="nav-group" key={g.name}>
                <p>{g.name}</p>
                {g.items
                  .filter(([p]) => allowed(p as string))
                  .map(([p, label, Icon]: any) => (
                    <NavLink
                      key={p}
                      to={p === "dashboard" ? "/" : "/" + p}
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                      end
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                      {p === "planning" && (
                        <span className="nav-tag">PLAN</span>
                      )}
                    </NavLink>
                  ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            {allowed("settings") && (
              <NavLink className="nav-link" to="/settings">
                <Settings size={18} />
                Settings
              </NavLink>
            )}
            <button
              className="profile"
              onClick={() =>
                user
                  ? api("auth/logout", { method: "POST" }).finally(() => {
                      setToken("");
                      setUser(null);
                      qc.clear();
                    })
                  : setConnecting(true)
              }
            >
              <span className="avatar">
                {user ? user.name.slice(0, 2).toUpperCase() : "KG"}
              </span>
              <span>
                <b>{user?.name || "Your farm workspace"}</b>
                <small>
                  {user ? title(user.role) : "Sign in to get started"}
                </small>
              </span>
              {user ? <LogOut size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </aside>
        {menu && (
          <button
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumbs">
              <IconButton label="Open navigation" onClick={() => setMenu(true)}>
                <Menu size={20} />
              </IconButton>
              <span>Workspace</span>
              <ChevronRight size={14} />
              <b>{current}</b>
            </div>
            <div className="top-right">
              <span className="location">
                <MapPin size={14} /> Coimbatore
              </span>
              <span
                className={
                  "environment " +
                  (health.data?.environment === "training" ? "training" : "")
                }
              >
                {health.data?.environment === "training"
                  ? "Training environment"
                  : user
                    ? "Business workspace"
                    : "Setup required"}
              </span>
              <button
                className="avatar small"
                aria-label="Account and password"
                onClick={() =>
                  user ? setAccountOpen(true) : setConnecting(true)
                }
              >
                {user?.name?.slice(0, 2).toUpperCase() || "KG"}
              </button>
            </div>
          </header>
          <main>
            {!user && (
              <div className="connection-banner">
                <span>
                  <Link2 size={17} />
                  <b>Your farm workspace.</b> Sign in to your business API to
                  load farm records.
                </span>
                <button onClick={() => setConnecting(true)}>
                  Sign in <ArrowRight size={15} />
                </button>
              </div>
            )}
            {allowed(path) ? (
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/traceability" element={<Traceability />} />
                <Route path="/settings" element={<SettingsPage />} />
                {Object.keys(names).map((p) => (
                  <Route
                    key={p}
                    path={"/" + p}
                    element={<Records key={p} resource={p} />}
                  />
                ))}
                <Route
                  path="*"
                  element={
                    <Empty heading="Page not found">
                      <Link to="/">Return to overview</Link>
                    </Empty>
                  }
                />
              </Routes>
            ) : (
              <Empty heading="This page is outside your role">
                <Link to={"/" + (rolePages[user!.role]?.[0] || "dashboard")}>
                  Open your workspace
                </Link>
              </Empty>
            )}
            <footer className="page-footer">
              <span>
                <Sprout size={13} /> From seed to doorstep.
              </span>
              <span>Weights in grams · Currency INR · Asia/Kolkata</span>
            </footer>
          </main>
        </div>
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={18} />
            {toast}
            <IconButton
              label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={14} />
            </IconButton>
          </div>
        )}
        {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}
        {connecting && (
          <Connect
            onClose={() => setConnecting(false)}
            onLogin={(r) => {
              setToken(r.accessToken);
              setUser(r.user);
              qc.invalidateQueries();
              setConnecting(false);
              setToast("Signed in successfully");
            }}
          />
        )}
      </div>
    </Ctx.Provider>
  );
}
function AccountDialog({ onClose }: { onClose: () => void }) {
  const { user, authChanged, notify } = useContext(Ctx);
  const [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Your account" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (newPassword !== confirmPassword)
            return setError("New passwords do not match");
          setBusy(true);
          setError("");
          try {
            const result = await api("account/password", {
              method: "POST",
              body: JSON.stringify({ currentPassword, newPassword }),
            });
            authChanged(result);
            notify("Password updated. Other sessions have been signed out.");
            onClose();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="form-intro">
          {user?.name} · {title(user?.role)}. Changing your password signs out
          other sessions.
        </p>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <small>Use at least 12 characters.</small>
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            type="button"
            className="button"
            onClick={async () => {
              await api("auth/logout", { method: "POST" });
              authChanged(null);
              onClose();
            }}
          >
            Sign out
          </button>
          <button className="button primary" disabled={busy}>
            Update password
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Connect({
  onClose,
  onLogin,
  standalone = false,
}: {
  onClose: () => void;
  onLogin: (r: Row) => void;
  standalone?: boolean;
}) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const content = (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            onLogin(
              await api("auth/login", {
                method: "POST",
                body: JSON.stringify({ username, password }),
              }),
            );
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="form-intro">
          Manage your farm, orders and deliveries in one place.
        </p>
        <label>
          Username
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          {!standalone && (
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Link2 size={17} />
            )}
            Sign in
          </button>
        </div>
      </form>
    </>
  );
  return standalone ? (
    <section className="login-card">
      <h2>Sign in</h2>
      {content}
    </section>
  ) : (
    <Modal title="Sign in to Kovai Greens" onClose={onClose}>
      {content}
    </Modal>
  );
}
function PageHeading({
  eyebrow,
  heading,
  description,
  children,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{heading}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Dashboard() {
  const { user, connect } = useContext(Ctx);
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("dashboard"),
    enabled: !!user,
  });
  const d = q.data;
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const [period, setPeriod] = useState("6");
  const metrics = [
    {
      label: "Today's orders",
      value: d?.todayOrders,
      icon: ShoppingBag,
      detail: "Orders received today",
      link: "/orders",
    },
    {
      label: "Today's deliveries",
      value: d?.todayDeliveries,
      icon: Truck,
      detail: "Scheduled for today",
      link: "/deliveries",
    },
    {
      label: "Monthly receipts",
      value: d ? money(d.monthlyRevenue) : undefined,
      icon: Wallet,
      detail: "Payments received this month",
      link: "/payments",
    },
    {
      label: "Active growing batches",
      value: d?.activeBatches,
      icon: Sprout,
      detail: d
        ? `${d.harvestToday} ready for harvest today`
        : "Your production at a glance",
      link: "/batches",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR FARM, AT A GLANCE"
        heading="Farm overview"
        description={today}
      >
        <Link to="/planning" className="button">
          <CalendarDays size={16} />
          Crop planning
        </Link>
        <button
          className="button primary"
          onClick={() =>
            user ? window.location.assign("/orders?new=1") : connect()
          }
        >
          <Plus size={17} />
          New order
        </button>
      </PageHeading>
      {q.error && (
        <div className="error">
          {q.error.message}
          <button onClick={() => q.refetch()}>Retry</button>
        </div>
      )}
      <section className="metric-grid">
        {metrics.map((m) => (
          <Link className="metric" to={m.link} key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <m.icon size={19} />
            </div>
            <strong>{q.isLoading ? "…" : (m.value ?? "—")}</strong>
            <div className="metric-bottom">
              <span>{m.detail}</span>
              <ArrowUpRight size={16} />
            </div>
          </Link>
        ))}
      </section>
      <div className="operating-strip">
        {[
          ["Today's receipts", d ? money(d.todayRevenue) : "—"],
          ["Low-stock varieties", d?.lowInventory?.length ?? "—"],
          ["School deliveries this week", d?.upcomingSchools?.length ?? "—"],
          [
            "Recurring deliveries this week",
            d?.upcomingSubscriptions?.length ?? "—",
          ],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      {!!d?.overdueBatches?.length && (
        <div className="notice">
          <AlertCircle size={18} />
          <span>
            {d.overdueBatches.length} growing batches are past their expected
            harvest date. Check the crop before promising supply.
          </span>
          <Link className="text-link" to="/batches">
            Review batches
          </Link>
        </div>
      )}
      <div className="dashboard-main">
        <section className="panel revenue">
          <div className="panel-heading">
            <div>
              <h2>Revenue overview</h2>
              <p>Collected payments, net of refunds</p>
            </div>
            <select
              aria-label="Revenue period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="6">Last 6 months</option>
              <option value="3">Last 3 months</option>
            </select>
          </div>
          <div className="revenue-number">
            {d ? money(d.monthlyRevenue) : "₹ —"}
            <span>this month</span>
          </div>
          {d ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={d.monthly.slice(-Number(period))}
                  margin={{ left: 4, right: 15, top: 12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4e8e6f"
                        stopOpacity={0.25}
                      />
                      <stop offset="100%" stopColor="#4e8e6f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="#e9eee9"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#748277" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#748277" }}
                    tickFormatter={(v) => "₹" + v / 1000 + "k"}
                  />
                  <Tooltip formatter={(v: any) => money(v * 100)} />
                  <Area
                    dataKey="revenue"
                    type="monotone"
                    stroke="#2d7051"
                    strokeWidth={2.5}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">
              <div className="chart-grid" />
              <span>
                <BarChart3 size={22} />
                Your revenue story starts with your first payment.
              </span>
              <div className="chart-months">
                {Array.from({ length: 6 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 5 + i, 1);
                  return d.toLocaleString("en-IN", { month: "short" });
                }).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="panel attention">
          <div className="panel-heading">
            <div>
              <h2>Farm priorities</h2>
              <p>What needs your attention</p>
            </div>
            <span className="subtle-icon">
              <ClipboardList size={18} />
            </span>
          </div>
          <Link className="priority" to="/harvests">
            <span className="priority-icon gold">
              <Sun size={20} />
            </span>
            <span>
              <b>Harvest due today</b>
              <small>
                {d
                  ? `${d.harvestToday} batches scheduled`
                  : "Check your harvest schedule"}
              </small>
            </span>
            <strong>{d?.harvestToday ?? "—"}</strong>
          </Link>
          <Link className="priority" to="/inventory">
            <span className="priority-icon orange">
              <Package size={20} />
            </span>
            <span>
              <b>Available stock</b>
              <small>Unreserved, unpacked produce</small>
            </span>
            <strong>
              {d
                ? weight(
                    d.stock
                      .filter(
                        (l: Row) =>
                          !l.bestBefore || new Date(l.bestBefore) >= new Date(),
                      )
                      .reduce(
                        (s: number, l: Row) =>
                          s + l.onHandGrams - l.reservedGrams - l.packedGrams,
                        0,
                      ),
                  )
                : "—"}
            </strong>
          </Link>
          <Link className="priority" to="/payments">
            <span className="priority-icon purple">
              <Wallet size={20} />
            </span>
            <span>
              <b>Pending payments</b>
              <small>Customer balances to collect</small>
            </span>
            <strong>{d ? money(d.pendingPayments) : "—"}</strong>
          </Link>
          <Link className="priority" to="/batches">
            <span className="priority-icon green">
              <Sprout size={20} />
            </span>
            <span>
              <b>This week's harvest</b>
              <small>Plan your team's work</small>
            </span>
            <strong>{d?.harvestWeek ?? "—"}</strong>
          </Link>
          <Link to="/planning" className="text-link full">
            Open production planner <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Upcoming deliveries</h2>
              <p>Orders scheduled for the next 7 days</p>
            </div>
            <Link className="text-link" to="/deliveries">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {d?.orders?.length ? (
            <div className="simple-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Delivery</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.orders.slice(0, 5).map((o: Row) => (
                    <tr key={o.id}>
                      <td>
                        <b>{o.customer.name}</b>
                        <small>
                          {title(o.customer.type)} · {o.customer.area}
                        </small>
                      </td>
                      <td>{o.number}</td>
                      <td>{date(o.deliveryAt)}</td>
                      <td>
                        <Badge value={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty heading="A clear delivery schedule" icon={Truck}>
              Confirmed orders appear here with their customer, area and
              delivery date.
            </Empty>
          )}
        </section>
        <section className="panel harvest-card">
          <div className="panel-heading">
            <div>
              <h2>Growing on your farm</h2>
              <p>From sowing to harvest</p>
            </div>
            <Sprout size={20} />
          </div>
          {d?.batches?.length ? (
            <div className="batch-list">
              {d.batches.slice(0, 3).map((b: Row) => (
                <Link to="/batches" key={b.id}>
                  <span className="crop-icon">
                    <Leaf size={22} />
                  </span>
                  <span>
                    <b>{b.product.name}</b>
                    <small>
                      {b.trays} trays · {date(b.harvestDueAt)}
                    </small>
                  </span>
                  <Badge value={b.status} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty heading="Room to grow" icon={Sprout}>
              Create your first growing batch to track its progress here.
            </Empty>
          )}
          <Link className="text-link full" to="/batches">
            Manage growing batches <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="quick-strip">
        <span>
          <ShieldCheck size={23} />
          <b>Every harvest has a story.</b>
          <span>Follow your produce from seed lot to customer.</span>
        </span>
        <Link to="/traceability">
          Explore traceability <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
function RecordForm({
  resource,
  initial,
  defaultKind,
  onClose,
  onSaved,
}: {
  resource: string;
  initial?: Row;
  defaultKind?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fs = fields[resource];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const products = useRows(
    "products",
    fs.some((f) => f.source === "products") ||
      ["products", "orders", "schedules"].includes(resource),
  );
  const sources = Array.from(
    new Set(fs.map((f) => f.source).filter(Boolean)),
  ) as string[];
  const refs = useQuery({
    queryKey: ["form-lookups", resource],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          sources
            .filter((s) => s !== "products")
            .map(async (s) => [s, (await api(s + "?limit=500")).data]),
        ),
      ),
    enabled: sources.some((s) => s !== "products"),
  });
  const options: Row = { ...refs.data, products: products.data?.data || [] };
  const defaults: Row = {};
  for (const f of fs) {
    let v = initial?.[f.key] ?? f.default ?? (f.type === "weekdays" ? [] : "");
    if (initial && f.key.includes("Paise")) v = Number(v) / 100;
    if (v && f.type === "date") v = String(v).slice(0, 10);
    defaults[f.key] = v;
  }
  if (resource === "schedules" && !initial && defaultKind)
    defaults.kind = defaultKind;
  const validators: Record<string, z.ZodTypeAny> = {};
  for (const f of fs) {
    validators[f.key] =
      f.type === "checkbox"
        ? z.boolean()
        : f.type === "weekdays"
          ? z.array(z.number()).min(1, "Choose a delivery day")
          : f.type === "number"
            ? z
                .union([z.string(), z.number()])
                .refine(
                  (v) =>
                    (!f.required && v === "") || (v !== "" && Number(v) >= 0),
                  "Enter a non-negative number",
                )
            : f.required
              ? z.string().min(1, "Required")
              : z.string().optional();
  }
  const form = useForm<Row>({
    defaultValues: defaults,
    resolver: zodResolver(z.object(validators)) as any,
  });
  const [items, setItems] = useState<Row[]>([
    { productId: "", packGrams: 50, quantity: 1, unitPricePaise: 0 },
  ]);
  const [formats, setFormats] = useState<Row[]>(
    initial?.formats?.map((f: Row) => ({
      grams: f.grams,
      pricePaise: f.pricePaise / 100,
    })) || [
      { grams: 50, pricePaise: 0 },
      { grams: 100, pricePaise: 0 },
    ],
  );
  const days = form.watch("weekdays") || [];
  async function submit(data: Row) {
    setBusy(true);
    setError("");
    try {
      const body: Row = {};
      for (const f of fs) {
        let v = data[f.key];
        if (!f.required && v === "") {
          if (f.type === "date" || f.type === "number" || f.type === "select")
            continue;
          v = "";
        }
        if (f.type === "number")
          v = Number(v) * (f.key.includes("Paise") ? 100 : 1);
        if (f.type === "date" && v) v = v + "T00:00:00+05:30";
        body[f.key] = v;
      }
      if (resource === "products")
        body.formats = formats.map((f) => ({
          grams: Number(f.grams),
          pricePaise: Math.round(Number(f.pricePaise) * 100),
        }));
      if (["orders", "schedules"].includes(resource))
        body.items = items.map((i) => ({
          ...i,
          packGrams: Number(i.packGrams),
          quantity: Number(i.quantity),
          unitPricePaise: Math.round(Number(i.unitPricePaise) * 100),
        }));
      if (resource === "payments") body.requestKey = crypto.randomUUID();
      if (resource === "schedules" && body.kind !== "SCHOOL")
        delete body.participatingStudents;
      await api(resource + (initial ? "/" + initial.id : ""), {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={(initial ? "Edit " : "New ") + (singular[resource] || resource)}
      onClose={onClose}
      wide
    >
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="form-grid">
          {fs.map((f) => (
            <label
              key={f.key}
              className={
                [
                  "notes",
                  "description",
                  "storageInstructions",
                  "weekdays",
                ].includes(f.key)
                  ? "full-width"
                  : ""
              }
            >
              {f.label}
              {f.required && <em> *</em>}
              {f.type === "checkbox" ? (
                <input
                  className="form-checkbox"
                  type="checkbox"
                  {...form.register(f.key)}
                />
              ) : f.type === "weekdays" ? (
                <div className="weekday-picker">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d, i) => (
                      <button
                        key={d}
                        type="button"
                        className={days.includes(i) ? "selected" : ""}
                        aria-pressed={days.includes(i)}
                        onClick={() =>
                          form.setValue(
                            "weekdays",
                            days.includes(i)
                              ? days.filter((x: number) => x !== i)
                              : [...days, i],
                            { shouldValidate: true },
                          )
                        }
                      >
                        {d}
                      </button>
                    ),
                  )}
                </div>
              ) : f.type === "select" ? (
                <select {...form.register(f.key)}>
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {f.options?.map((s) => (
                    <option key={s} value={s}>
                      {title(s)}
                    </option>
                  ))}
                  {f.source &&
                    options[f.source]?.map((s: Row) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.code || s.number || s.lotNumber}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  {...form.register(f.key)}
                  type={f.type}
                  step={
                    f.key.includes("Paise")
                      ? "0.01"
                      : f.type === "number"
                        ? "1"
                        : undefined
                  }
                  min={f.type === "number" ? 0 : undefined}
                />
              )}
              <small>{f.help}</small>
              {form.formState.errors[f.key] && (
                <span className="field-error">
                  {String(form.formState.errors[f.key]?.message)}
                </span>
              )}
            </label>
          ))}
        </div>
        {(refs.error || products.error) && (
          <p className="error">
            Could not load form options.{" "}
            {refs.error?.message || products.error?.message}
          </p>
        )}
        {resource === "products" && (
          <div className="line-items">
            <h3>Selling formats</h3>
            {formats.map((f, i) => (
              <div className="format-row" key={i}>
                <label>
                  Pack weight (g)
                  <input
                    aria-label={`Format ${i + 1} grams`}
                    type="number"
                    min="1"
                    required
                    value={f.grams}
                    onChange={(e) =>
                      setFormats(
                        formats.map((v, j) =>
                          j === i ? { ...v, grams: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Price (₹)
                  <input
                    aria-label={`Format ${i + 1} price`}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={f.pricePaise}
                    onChange={(e) =>
                      setFormats(
                        formats.map((v, j) =>
                          j === i ? { ...v, pricePaise: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <IconButton
                  label="Remove format"
                  onClick={() => setFormats(formats.filter((_, j) => i !== j))}
                >
                  <X size={16} />
                </IconButton>
              </div>
            ))}
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setFormats([...formats, { grams: 250, pricePaise: 0 }])
              }
            >
              <Plus size={15} />
              Add format
            </button>
          </div>
        )}
        {["orders", "schedules"].includes(resource) && (
          <div className="line-items">
            <h3>
              {resource === "orders" ? "Order items" : "Recurring products"}
            </h3>
            {items.map((item, i) => (
              <div key={i} className="item-row">
                <label>
                  Product
                  <select
                    required
                    value={item.productId}
                    onChange={(e) => {
                      const p = options.products.find(
                        (p: Row) => p.id === e.target.value,
                      );
                      setItems(
                        items.map((v, j) =>
                          j === i
                            ? {
                                ...v,
                                productId: e.target.value,
                                packGrams: p?.formats?.[0]?.grams || 50,
                                unitPricePaise:
                                  (p?.formats?.[0]?.pricePaise || 0) / 100,
                              }
                            : v,
                        ),
                      );
                    }}
                  >
                    <option value="">Select product</option>
                    {options.products.map((p: Row) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Pack (g)
                  <select
                    value={item.packGrams}
                    onChange={(e) => {
                      const fmt = options.products
                        .find((p: Row) => p.id === item.productId)
                        ?.formats.find(
                          (f: Row) => f.grams === Number(e.target.value),
                        );
                      setItems(
                        items.map((v, j) =>
                          i === j
                            ? {
                                ...v,
                                packGrams: Number(e.target.value),
                                unitPricePaise: (fmt?.pricePaise || 0) / 100,
                              }
                            : v,
                        ),
                      );
                    }}
                  >
                    {options.products
                      .find((p: Row) => p.id === item.productId)
                      ?.formats.map((f: Row) => (
                        <option key={f.grams} value={f.grams}>
                          {f.grams}g
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Packs
                  <input
                    required
                    min="1"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((v, j) =>
                          j === i ? { ...v, quantity: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Price / pack (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={item.unitPricePaise}
                    onChange={(e) =>
                      setItems(
                        items.map((v, j) =>
                          j === i
                            ? { ...v, unitPricePaise: e.target.value }
                            : v,
                        ),
                      )
                    }
                  />
                </label>
                <IconButton
                  label="Remove order item"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                >
                  <X size={16} />
                </IconButton>
              </div>
            ))}
            <div className="spread">
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      productId: "",
                      packGrams: 50,
                      quantity: 1,
                      unitPricePaise: 0,
                    },
                  ])
                }
              >
                <Plus size={15} />
                Add item
              </button>
              <b>
                Subtotal{" "}
                {money(
                  items.reduce(
                    (s, i) => s + i.quantity * i.unitPricePaise * 100,
                    0,
                  ),
                )}
              </b>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy || !!refs.error || !!products.error}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            Save {singular[resource] || "record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Records({ resource: page }: { resource: string }) {
  const resource = page === "schools" ? "schedules" : page;
  const { user, connect, notify } = useContext(Ctx);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [form, setForm] = useState(false),
    [editing, setEditing] = useState<Row | undefined>(),
    [selected, setSelected] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(1),
    [pageSize, setPageSize] = useState(20),
    [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(search);
      setPageIndex(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPageIndex(1), [filter, pageSize]);
  const q = useQuery({
    queryKey: [resource, pageIndex, pageSize, searchQuery, filter, page],
    queryFn: () =>
      api(
        resource +
          "?" +
          new URLSearchParams({
            page: String(pageIndex),
            limit: String(pageSize),
            q: searchQuery,
            status: filter,
            ...(resource === "schedules"
              ? { kind: page === "schools" ? "SCHOOL" : "SUBSCRIPTION" }
              : {}),
          }),
      ),
    enabled: !!user,
  });
  const client = useQueryClient();
  useEffect(() => {
    if (new URLSearchParams(location.search).get("new") && user) setForm(true);
  }, []);
  const saved = () => {
    client.invalidateQueries();
    notify("Record saved");
  };
  let rows: Row[] = q.data?.data || [];
  if (page === "schools") rows = rows.filter((r) => r.kind === "SCHOOL");
  if (page === "schedules")
    rows = rows.filter((r) => r.kind === "SUBSCRIPTION");
  const filtered = rows;
  const statuses = nextStates[resource]
    ? Array.from(
        new Set([
          ...Object.keys(nextStates[resource]),
          ...Object.values(nextStates[resource]).flat(),
        ]),
      )
    : Array.from(new Set(rows.map((r) => r.status || r.type).filter(Boolean)));
  const cols = (columns[resource] || []).map((c) =>
    c.headerName === "Status" || c.headerName === "Payment"
      ? { ...c, cellRenderer: (p: any) => <Badge value={p.value} /> }
      : c,
  );
  async function mutate(body: Row) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api(resource + "/" + selected.id, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      saved();
      setSelected(null);
      setConfirm(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const canCreate =
    !!fields[resource] &&
    (!user || user.role !== "DELIVERY") &&
    !(
      resource === "products" &&
      user &&
      ["SALES", "FARM_WORKER"].includes(user.role)
    ) &&
    !(resource === "users" && user?.role !== "OWNER") &&
    !(
      resource === "orders" &&
      user &&
      ["PRODUCTION_MANAGER", "FARM_WORKER"].includes(user.role)
    );
  return (
    <>
      <PageHeading
        eyebrow={
          [
            "batches",
            "harvests",
            "inventory",
            "products",
            "seed-lots",
            "suppliers",
          ].includes(resource)
            ? "FARM OPERATIONS"
            : "BUSINESS WORKSPACE"
        }
        heading={names[page]}
        description={descriptions[page]}
      >
        <button
          className="button"
          disabled={!filtered.length}
          onClick={() =>
            csv(
              page,
              filtered.map((r) =>
                Object.fromEntries(
                  cols.map((c) => [c.headerName, c.valueGetter({ data: r })]),
                ),
              ),
            )
          }
        >
          <ArrowDownToLine size={16} />
          Export this page
        </button>
        {canCreate && (
          <button
            className="button primary"
            onClick={() => (user ? setForm(true) : connect())}
          >
            <Plus size={17} />
            New {singular[page]}
          </button>
        )}
      </PageHeading>
      {resource === "seed-lots" && (
        <div className="tabs">
          <Link className="selected" to="/seed-lots">
            Seed inventory
          </Link>
          <Link to="/suppliers">Suppliers</Link>
        </div>
      )}
      {resource === "inventory" && (
        <div className="tabs">
          <Link className="selected" to="/inventory">
            Stock on hand
          </Link>
          <Link to="/movements">Transaction history</Link>
        </div>
      )}
      {resource === "schedules" && (
        <div className="notice">
          <Repeat size={18} />
          <span>
            Generate draft orders up to 30 days ahead. Existing schedule dates
            are skipped.
          </span>
          <button
            className="text-link"
            disabled={busy}
            onClick={async () => {
              if (!user) return connect();
              setBusy(true);
              try {
                const r = await api("schedules/generate", {
                  method: "POST",
                  body: JSON.stringify({
                    through: new Date(Date.now() + 30 * 86400000).toISOString(),
                  }),
                });
                notify(`${r.created} new draft orders generated`);
                client.invalidateQueries();
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Generate orders <ArrowRight size={15} />
          </button>
        </div>
      )}
      {resource === "payments" && (
        <div className="tabs">
          <Link className="selected" to="/payments">
            Transactions
          </Link>
          <Link to="/billing">Monthly statements</Link>
        </div>
      )}
      {resource === "packing" && (
        <div className="notice">
          <Box size={18} />
          <span>
            Packing records are created when an order moves from Packing to
            Packed.
          </span>
          <Link className="text-link" to="/orders">
            Open orders <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <section className="panel records-panel">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label={`Search ${names[page]}`}
              placeholder={`Search ${names[page].toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="table-controls">
            <span>{q.data?.total ?? 0} records</span>
            {statuses.length > 0 && (
              <select
                aria-label="Filter status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
            <IconButton
              label="Refresh records"
              onClick={() => (user ? q.refetch() : connect())}
            >
              <RefreshCw size={16} />
            </IconButton>
          </div>
        </div>
        {q.isLoading ? (
          <Empty heading="Loading records…" icon={LoaderCircle} />
        ) : q.error ? (
          <Empty heading="Records could not be loaded" icon={AlertCircle}>
            {q.error.message}
            <button className="button" onClick={() => q.refetch()}>
              Try again
            </button>
          </Empty>
        ) : !rows.length ? (
          <Empty
            heading={
              user
                ? `No ${names[page].toLowerCase()} yet`
                : `Your ${names[page].toLowerCase()} will appear here`
            }
            icon={
              resource === "orders"
                ? ShoppingBag
                : resource === "customers"
                  ? Users
                  : Package
            }
          >
            {user
              ? canCreate
                ? `Add your first ${singular[page]} to get started.`
                : "Records appear automatically as your farm workflow progresses."
              : "Sign in to securely load your business records."}
            {
              <button
                className="button primary"
                onClick={() =>
                  user
                    ? canCreate
                      ? setForm(true)
                      : window.location.assign("/")
                    : connect()
                }
              >
                {user
                  ? canCreate
                    ? "Add " + singular[page]
                    : "Back to overview"
                  : "Sign in"}
                <ArrowRight size={15} />
              </button>
            }
          </Empty>
        ) : (
          <div className="grid-wrap">
            <React.Suspense fallback={<Empty heading="Loading table…" />}>
              <BusinessGrid
                rowData={filtered}
                columnDefs={cols as any}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                pagination={false}
                onRowClicked={(e: any) => {
                  setSelected(e.data!);
                  setError("");
                }}
                getRowId={(p: any) => p.data.id}
                tooltipShowDelay={200}
              />
            </React.Suspense>
          </div>
        )}
        <div className="table-bottom">
          <ShieldCheck size={14} />
          <span>
            {resource === "inventory"
              ? "Stock changes are recorded in the inventory ledger."
              : "Select a row to view details and available actions."}
          </span>
          <span>Column sorting and grid filters apply to this page.</span>
        </div>
        <div className="server-pagination">
          <label>
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <span>
            Page {pageIndex} of{" "}
            {Math.max(1, Math.ceil((q.data?.total || 0) / pageSize))}
          </span>
          <button
            className="button"
            disabled={pageIndex === 1 || q.isFetching}
            onClick={() => setPageIndex((p) => p - 1)}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            className="button"
            disabled={
              pageIndex * pageSize >= (q.data?.total || 0) || q.isFetching
            }
            onClick={() => setPageIndex((p) => p + 1)}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
      {error && !selected && <p className="error">{error}</p>}
      {form && (
        <RecordForm
          resource={resource}
          initial={editing}
          defaultKind={page === "schools" ? "SCHOOL" : "SUBSCRIPTION"}
          onClose={() => {
            setForm(false);
            setEditing(undefined);
          }}
          onSaved={saved}
        />
      )}{" "}
      {selected && (
        <Modal
          title={
            selected.name ||
            selected.code ||
            selected.number ||
            names[page] + " details"
          }
          onClose={() => setSelected(null)}
          wide
        >
          <div className="detail-summary">
            {cols.map((c) => (
              <div key={c.headerName}>
                <span>{c.headerName}</span>
                <b>{String(c.valueGetter({ data: selected }) ?? "—")}</b>
              </div>
            ))}
          </div>
          {["batches", "orders"].includes(resource) && (
            <RecordHistory resource={resource} id={selected.id} />
          )}
          {resource === "orders" && (
            <>
              <h3>Order items</h3>
              {selected.items.map((i: Row) => (
                <div className="detail-line" key={i.id}>
                  <span>
                    {i.product.name} · {i.quantity} × {i.packGrams}g
                  </span>
                  <b>{money(i.quantity * i.unitPricePaise)}</b>
                </div>
              ))}
              <div className="detail-line">
                <span>Outstanding balance</span>
                <b>{money(selected.totalPaise - selected.paidPaise)}</b>
              </div>
              <Link
                className="text-link"
                to={"/traceability?id=" + selected.id}
              >
                View batch traceability <ArrowRight size={15} />
              </Link>
            </>
          )}
          {resource === "audit" && (
            <pre className="json-detail">
              {JSON.stringify(
                { before: selected.oldValue, after: selected.newValue },
                null,
                2,
              )}
            </pre>
          )}
          {resource === "payments" && (
            <div className="tabs">
              <Link className="selected" to="/payments">
                Transactions
              </Link>
              <Link to="/billing">Monthly statements</Link>
            </div>
          )}
          {resource === "packing" && selected.status !== "CANCELLED" && (
            <PackingLabel id={selected.id} />
          )}
          {resource === "deliveries" && (
            <DeliveryForm record={selected} onSubmit={mutate} busy={busy} />
          )}
          <div className="action-row">
            {["products", "customers", "suppliers"].includes(resource) &&
              !(
                resource === "products" &&
                user &&
                ["SALES", "FARM_WORKER"].includes(user.role)
              ) && (
                <button
                  className="button"
                  onClick={() => {
                    setEditing(selected);
                    setSelected(null);
                    setForm(true);
                  }}
                >
                  Edit record
                </button>
              )}
            {(nextStates[resource]?.[selected.status] || [])
              .filter(
                (s) =>
                  resource !== "orders" ||
                  !user ||
                  !["PRODUCTION_MANAGER", "FARM_WORKER"].includes(user.role) ||
                  ["ALLOCATED", "PACKING", "PACKED"].includes(s),
              )
              .map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  className={
                    "button " +
                    (["CANCELLED", "FAILED"].includes(s) ? "danger" : "primary")
                  }
                  onClick={() => setConfirm(s)}
                >
                  {title(s)}
                </button>
              ))}
            {resource === "inventory" && (
              <Discard
                record={selected}
                onSaved={() => {
                  saved();
                  setSelected(null);
                }}
              />
            )}
            {resource === "users" &&
              user?.role === "OWNER" &&
              selected.id !== user.id && (
                <label>
                  Role
                  <select
                    value={selected.role}
                    disabled={busy}
                    onChange={(e) => mutate({ role: e.target.value })}
                  >
                    {[
                      "OWNER",
                      "ADMIN",
                      "PRODUCTION_MANAGER",
                      "FARM_WORKER",
                      "SALES",
                      "DELIVERY",
                    ].map((role) => (
                      <option key={role} value={role}>
                        {title(role)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            {resource === "users" &&
              user?.role === "OWNER" &&
              selected.id !== user.id && (
                <button
                  className="button danger"
                  onClick={() => mutate({ active: !selected.active })}
                >
                  {selected.active ? "Deactivate user" : "Reactivate user"}
                </button>
              )}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {confirm && (
            <div className="confirmation">
              <b>
                Change this {singular[resource] || "record"} to {title(confirm)}
                ?
              </b>
              <p>
                {resource === "orders"
                  ? "This may reserve, release or move inventory. The change will be recorded."
                  : "This change will be recorded in the audit log."}
              </p>
              <div className="action-row">
                <button className="button" onClick={() => setConfirm(null)}>
                  Keep current status
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => mutate({ status: confirm })}
                >
                  Confirm change
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
function RecordHistory({ resource, id }: { resource: string; id: string }) {
  const q = useQuery({
    queryKey: ["history", resource, id],
    queryFn: () => api("history/" + resource + "/" + id),
  });
  return (
    <section className="record-history">
      <h3>Timeline</h3>
      {q.error ? (
        <p className="error">{q.error.message}</p>
      ) : (
        q.data?.map((r: Row) => (
          <div key={r.id}>
            <span className="timeline-mark" />
            <p>
              <b>{title(r.action)}</b>
              {r.newValue?.status && <Badge value={r.newValue.status} />}
              <small>
                {new Date(r.createdAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                · {r.actorName}
              </small>
            </p>
          </div>
        ))
      )}
    </section>
  );
}
function PackingLabel({ id }: { id: string }) {
  const [opened, setOpened] = useState(false);
  const q = useQuery({
    queryKey: ["packing-label", id],
    queryFn: () => api("packing/" + id + "/label"),
    enabled: opened,
  });
  return (
    <div className="packing-label-container">
      <button className="button" onClick={() => setOpened(true)}>
        <ShieldCheck size={16} />
        Show QR label
      </button>
      {q.error && <p className="error">{q.error.message}</p>}
      {q.data && (
        <>
          <div className="package-label" id="print-label">
            <div>
              <h2>{q.data.farm}</h2>
              <h3>
                {q.data.product} · {q.data.packGrams}g
              </h3>
              <p>Batch: {q.data.batch}</p>
              <p>Harvested: {date(q.data.harvestedAt)}</p>
              <p>Packed: {date(q.data.packedAt)}</p>
              {q.data.bestBefore && (
                <p>Best before: {date(q.data.bestBefore)}</p>
              )}
              <p>{q.data.storageInstructions}</p>
              <small>{q.data.address}</small>
            </div>
            <img
              width="128"
              height="128"
              src={q.data.qrDataUrl}
              alt="Scan for this package's harvest and farm information"
            />
          </div>
          <div className="action-row">
            <a
              className="button"
              href={q.data.traceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Public package page <ArrowUpRight size={16} />
            </a>
            <button className="button primary" onClick={() => window.print()}>
              Print label
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function DeliveryForm({
  record,
  onSubmit,
  busy,
}: {
  record: Row;
  onSubmit: (r: Row) => void;
  busy: boolean;
}) {
  const { user } = useContext(Ctx);
  const [driver, setDriver] = useState(record.driverId || ""),
    [route, setRoute] = useState(record.route || ""),
    [vehicle, setVehicle] = useState(record.vehicle || ""),
    [notes, setNotes] = useState(record.notes || ""),
    [deliveryAt, setDeliveryAt] = useState(
      record.deliveryAt
        ? new Date(+new Date(record.deliveryAt) + 19800000)
            .toISOString()
            .slice(0, 16)
        : "",
    ),
    [timeSlot, setTimeSlot] = useState(record.timeSlot || "");
  const users = useRows("delivery-drivers", user?.role !== "DELIVERY");
  return (
    <div className="delivery-form">
      <p>{record.address}</p>
      {user?.role !== "DELIVERY" && (
        <div className="form-grid">
          <label>
            Driver
            {users.data ? (
              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              >
                <option value="">Select driver</option>
                {users.data.data
                  .filter((u: Row) => !!u.id)
                  .map((u: Row) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                placeholder="Driver user ID"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              />
            )}
          </label>
          <label>
            Route
            <input value={route} onChange={(e) => setRoute(e.target.value)} />
          </label>
          <label>
            Vehicle
            <input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </label>
        </div>
      )}
      {user?.role !== "DELIVERY" && (
        <div className="form-grid">
          <label>
            Delivery date and time (IST)
            <input
              type="datetime-local"
              value={deliveryAt}
              onChange={(e) => setDeliveryAt(e.target.value)}
            />
          </label>
          <label>
            Delivery time slot
            <input
              placeholder="e.g. 7:00–9:00 AM"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            />
          </label>
        </div>
      )}
      <label>
        Delivery notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="action-row">
        {user?.role !== "DELIVERY" &&
          !["CANCELLED", "DELIVERED"].includes(record.status) && (
            <button
              className="button"
              disabled={busy || !deliveryAt}
              onClick={() =>
                onSubmit({
                  status: "RESCHEDULED",
                  deliveryAt: new Date(deliveryAt + ":00+05:30").toISOString(),
                  timeSlot,
                  notes,
                })
              }
            >
              Reschedule delivery
            </button>
          )}
        {user?.role !== "DELIVERY" &&
          ["PENDING", "ASSIGNED", "RESCHEDULED"].includes(record.status) && (
            <button
              className="button primary"
              disabled={busy || !driver}
              onClick={() =>
                onSubmit({
                  driverId: driver,
                  route,
                  vehicle,
                  notes,
                  timeSlot,
                  status: "ASSIGNED",
                })
              }
            >
              Save assignment
            </button>
          )}
        {["OUT_FOR_DELIVERY", "FAILED"].includes(record.status) && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => onSubmit({ status: "DELIVERED", notes })}
          >
            Mark delivered
          </button>
        )}
        {record.status === "OUT_FOR_DELIVERY" && (
          <button
            className="button danger"
            disabled={busy}
            onClick={() => onSubmit({ status: "FAILED", notes })}
          >
            Delivery failed
          </button>
        )}
      </div>
    </div>
  );
}
function Discard({ record, onSaved }: { record: Row; onSaved: () => void }) {
  const [open, setOpen] = useState(false),
    [grams, setGrams] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      {!open ? (
        <button className="button danger" onClick={() => setOpen(true)}>
          Discard stock
        </button>
      ) : (
        <form
          className="discard-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("inventory/" + record.id + "/discard", {
                method: "POST",
                body: JSON.stringify({ grams: Number(grams), reason }),
              });
              onSaved();
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Discard quantity (g)
            <input
              type="number"
              min="1"
              required
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </label>
          <label>
            Reason
            <input
              minLength={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="button danger" disabled={busy}>
            Confirm discard
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </>
  );
}
function Planning() {
  const { user, connect } = useContext(Ctx);
  const [days, setDays] = useState(7);
  const q = useQuery({
    queryKey: ["planning", days],
    queryFn: () =>
      api(
        "planning?to=" + new Date(Date.now() + days * 86400000).toISOString(),
      ),
    enabled: !!user,
  });
  return (
    <>
      <PageHeading
        eyebrow="PLAN WITH CONFIDENCE"
        heading="Crop planning"
        description="Match your sowing schedule to upcoming customer demand."
      >
        <select
          aria-label="Planning horizon"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
          <option value={30}>Next 30 days</option>
        </select>
        <Link className="button primary" to="/batches?new=1">
          <Plus size={16} />
          Plan a batch
        </Link>
      </PageHeading>
      <div className="planning-explainer">
        <div>
          <span className="priority-icon green">
            <CalendarDays size={24} />
          </span>
          <h2>The right crop. At the right time.</h2>
          <p>
            Unreserved demand includes draft orders, school programs and active
            subscriptions. Confirmed orders already hold stock. Supply is
            matched by harvest and delivery date, with expired stock excluded.
          </p>
        </div>
        <div className="formula">
          <span>Upcoming demand</span>
          <span>− Available harvests & growing batches</span>
          <strong>= Additional trays to sow</strong>
        </div>
      </div>
      {!!q.data?.length && (
        <section className="panel report-chart">
          <h2>Production and unreserved demand (kg)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={q.data.map((p: Row) => ({
                name: p.product.name,
                demand: p.demandGrams / 1000,
                stock: p.stockGrams / 1000,
                growing: p.growingGrams / 1000,
              }))}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="demand" name="Unreserved demand" fill="#224e3b" />
              <Bar dataKey="stock" name="Available stock" fill="#91b86e" />
              <Bar dataKey="growing" name="Expected harvest" fill="#d0dba3" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Production recommendations</h2>
            <p>
              Expected yields are estimates; confirm quality and actual harvest
              quantities.
            </p>
          </div>
          <span className="badge">{days}-day horizon</span>
        </div>
        {q.error ? (
          <Empty heading="Could not load planning" icon={AlertCircle}>
            {q.error.message}
          </Empty>
        ) : q.data?.length ? (
          <div className="planning-list">
            {q.data.map((p: Row) => (
              <div className="plan-row" key={p.product.id}>
                <span className="crop-icon">
                  <Leaf size={25} />
                </span>
                <div className="plan-name">
                  <h3>{p.product.name}</h3>
                  <small>
                    {p.product.growingDays} growing days ·{" "}
                    {p.product.yieldGramsPerTray}g per tray
                  </small>
                </div>
                <div>
                  <small>Demand</small>
                  <b>{weight(p.demandGrams)}</b>
                </div>
                <div>
                  <small>In stock</small>
                  <b>{weight(p.stockGrams)}</b>
                </div>
                <div>
                  <small>Growing</small>
                  <b>{weight(p.growingGrams)}</b>
                </div>
                <div className="plan-advice">
                  {p.additionalTrays ? (
                    <>
                      <b>Plant {p.additionalTrays} trays</b>
                      <small
                        className={
                          new Date(p.plantBy) < new Date() ? "overdue" : ""
                        }
                      >
                        By {date(p.plantBy)}
                        {new Date(p.plantBy) < new Date()
                          ? " · timing risk"
                          : ""}
                      </small>
                    </>
                  ) : (
                    <Badge value="COVERED" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            heading={
              q.isLoading
                ? "Calculating demand…"
                : "Your next harvest starts here"
            }
            icon={CalendarDays}
          >
            Add products and customer demand to see sowing recommendations.
            {!user && (
              <button className="button primary" onClick={connect}>
                Sign in
              </button>
            )}
          </Empty>
        )}
      </section>
    </>
  );
}
function Reports() {
  const { user } = useContext(Ctx);
  const [from, setFrom] = useState(
      new Date().toISOString().slice(0, 7) + "-01",
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10)),
    [tab, setTab] = useState("sales");
  const q = useQuery({
    queryKey: ["reports", from, to],
    queryFn: () =>
      api(`reports?from=${from}T00:00:00%2B05:30&to=${to}T23:59:59%2B05:30`),
    enabled: !!user && !!from && !!to,
  });
  const d = q.data;
  const rows: Row[] =
    tab === "yield"
      ? d?.harvests || []
      : tab === "expenses"
        ? d?.expenses || []
        : d?.orders || [];
  let exportRows: Row[] = rows.map((r) =>
    tab === "yield"
      ? {
          Batch: r.batch.code,
          Product: r.product.name,
          Harvest: date(r.harvestedAt),
          UsableGrams: r.usableGrams,
          RejectedGrams: r.rejectedGrams,
          YieldPerTrayGrams: r.usableGrams / r.batch.trays,
        }
      : tab === "expenses"
        ? {
            Category: r.category,
            Description: r.description,
            AmountRupees: r.amountPaise / 100,
            Date: date(r.incurredAt),
          }
        : {
            Order: r.number,
            Customer: r.customer.name,
            Type: r.customer.type,
            TotalRupees: r.totalPaise / 100,
            Date: date(r.createdAt),
            Source: r.schedule?.kind || "DIRECT",
          },
  );
  if (["customers", "types", "daily", "sources", "outstanding"].includes(tab)) {
    const source =
      tab === "types"
        ? d?.byCustomerType
        : tab === "daily"
          ? d?.byDay
          : tab === "sources"
            ? d?.bySource
            : d?.byCustomer;
    exportRows = (source || [])
      .filter((r: Row) => tab !== "outstanding" || r.outstandingPaise > 0)
      .map((r: Row) => ({
        Name: title(r.name),
        Orders: r.orders,
        SalesRupees: r.salesPaise / 100,
        OutstandingRupees: r.outstandingPaise / 100,
      }));
  }
  if (tab === "costs")
    exportRows = (d?.costRows || []).map((r: Row) => ({
      Batch: r.batch,
      Product: r.product,
      UsableGrams: r.usableGrams,
      SeedCostRupees: r.seedCostPaise / 100,
      DirectExpensesRupees: r.allocatedExpensesPaise / 100,
      ProductionCostRupees: r.totalCostPaise / 100,
      CostPerKgRupees:
        r.costPaisePerKg === null ? "No usable yield" : r.costPaisePerKg / 100,
    }));
  const yieldData: Row[] = [];
  for (const h of d?.harvests || []) {
    let r = yieldData.find((r) => r.name === h.product.name);
    if (!r) {
      r = {
        name: h.product.name,
        expected: 0,
        usable: 0,
        rejected: 0,
        total: 0,
      };
      yieldData.push(r);
    }
    r.expected += h.batch.expectedGrams / 1000;
    r.usable += h.usableGrams / 1000;
    r.rejected += h.rejectedGrams;
    r.total += h.harvestedGrams;
  }
  for (const r of yieldData)
    r.wastage = Number(((r.rejected / r.total) * 100).toFixed(1));
  const agg: Row[] = [];
  for (const o of d?.orders || [])
    for (const i of o.items) {
      let r = agg.find((a) => a.name === i.product.name);
      if (!r) {
        r = { name: i.product.name, sales: 0 };
        agg.push(r);
      }
      r.sales += (i.quantity * i.unitPricePaise) / 100;
    }
  return (
    <>
      <PageHeading
        eyebrow="FINANCE & INSIGHTS"
        heading="Business reports"
        description="Sales, production and expenses over the period you choose."
      >
        <label className="date-filter">
          From
          <input
            aria-label="Report start date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="date-filter">
          To
          <input
            aria-label="Report end date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="button"
          disabled={!exportRows.length}
          onClick={() => csv("kovai-" + tab, exportRows)}
        >
          <ArrowDownToLine size={16} />
          Export CSV
        </button>
      </PageHeading>
      <section className="metric-grid report-metrics">
        {[
          ["Order value", d?.salesPaise],
          ["Net receipts", d?.cashCollectedPaise],
          ["Recorded expenses", d?.expensesPaise],
          [
            "Cash surplus",
            d ? d.cashCollectedPaise - d.expensesPaise : undefined,
          ],
        ].map(([label, value]) => (
          <div className="metric" key={label as string}>
            <span>{label}</span>
            <strong>
              {value === undefined ? "—" : money(value as number)}
            </strong>
          </div>
        ))}
      </section>
      <div className="notice">
        <AlertCircle size={17} />
        <span>
          Cash surplus is net receipts minus recorded expenses. Production cost
          and estimated gross profit use seed consumption and explicitly
          allocated batch expenses.
        </span>
      </div>
      {agg.length > 0 && (
        <section className="panel report-chart">
          <h2>Sales by variety</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={agg}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: any) => money(v * 100)} />
              <Bar dataKey="sales" fill="#397659" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
      {!!d?.byCustomerType?.length && (
        <section className="panel report-chart">
          <h2>Orders by customer type</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={d.byCustomerType.map((r: Row) => ({
                ...r,
                name: title(r.name),
              }))}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#779c5e" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
      {!!yieldData.length && (
        <div className="report-chart-grid">
          <section className="panel report-chart">
            <h2>Harvest yield (kg)</h2>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={yieldData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="expected" fill="#cbd8b9" />
                <Bar dataKey="usable" fill="#397659" />
              </BarChart>
            </ResponsiveContainer>
          </section>
          <section className="panel report-chart">
            <h2>Harvest wastage (%)</h2>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={yieldData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="wastage" fill="#c79b72" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}
      {tab === "costs" && d && (
        <>
          <div className="operating-strip">
            {[
              ["Delivered sales, excl. tax", d.deliveredNetSalesPaise],
              ["Allocated production cost", d.deliveredCostPaise],
              ["Estimated gross profit", d.estimatedGrossProfitPaise],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <b>{money(Number(value))}</b>
              </div>
            ))}
          </div>
          <div className="notice">
            <AlertCircle size={18} />
            <span>
              Margin covers delivered orders created in this reporting period.
              Costs include consumed seeds and expenses explicitly assigned to
              their growing batches, apportioned over usable harvest.
              Unallocated overhead, inventory write-offs and returns are
              excluded.
            </span>
          </div>
        </>
      )}
      <section className="panel">
        <div className="tabs padded">
          {[
            ["sales", "Sales ledger"],
            ["yield", "Production yield"],
            ["expenses", "Expenses"],
            ["customers", "Top customers"],
            ["types", "Customer types"],
            ["daily", "Daily sales"],
            ["sources", "School & subscription revenue"],
            ["outstanding", "Outstanding"],
            ["costs", "Production cost & margin"],
          ].map(([key, label]) => (
            <button
              className={tab === key ? "selected" : ""}
              key={key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {q.error ? (
          <Empty heading="Report unavailable" icon={AlertCircle}>
            {q.error.message}
          </Empty>
        ) : exportRows.length ? (
          <div className="simple-table">
            <table>
              <thead>
                <tr>
                  {Object.keys(exportRows[0]).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exportRows.map((r, i) => (
                  <tr key={i}>
                    {Object.values(r).map((v, j) => (
                      <td key={j}>{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty heading="No records for this period" icon={BarChart3}>
            Your recorded sales, harvests and expenses will form these reports.
          </Empty>
        )}
      </section>
    </>
  );
}
function Billing() {
  const { user } = useContext(Ctx);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const q = useQuery({
    queryKey: ["billing", month],
    queryFn: () => api("billing?month=" + month),
    enabled: !!user && !!month,
  });
  const rows = q.data?.statements || [];
  return (
    <>
      <PageHeading
        eyebrow="PAYMENTS & BILLING"
        heading="Monthly statements"
        description="Customer balances for orders delivered or scheduled in the selected month."
      >
        <input
          type="month"
          aria-label="Statement month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button
          className="button"
          disabled={!rows.length}
          onClick={() =>
            csv(
              "statements-" + month,
              rows.map((r: Row) => ({
                Customer: r.customer.name,
                Type: r.customer.type,
                OrderValue: r.invoiceAmountPaise / 100,
                Paid: r.amountPaidPaise / 100,
                Outstanding: r.outstandingPaise / 100,
              })),
            )
          }
        >
          <ArrowDownToLine size={16} />
          Export CSV
        </button>
      </PageHeading>
      <div className="tabs">
        <Link to="/payments">Transactions</Link>
        <Link to="/billing" className="selected">
          Monthly statements
        </Link>
      </div>
      <div className="notice">
        <Receipt size={18} />
        <span>
          These are account statements, not tax invoices. Payments reflect
          current net receipts, including refunds.
        </span>
      </div>
      {q.error && <p className="error">{q.error.message}</p>}
      <section className="panel">
        {rows.length ? (
          <div className="simple-table">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Orders</th>
                  <th>Order value</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: Row) => (
                  <tr key={r.customer.id}>
                    <td>{r.customer.name}</td>
                    <td>{title(r.customer.type)}</td>
                    <td>{r.orders.length}</td>
                    <td>{money(r.invoiceAmountPaise)}</td>
                    <td>{money(r.amountPaidPaise)}</td>
                    <td>{money(r.outstandingPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty heading="No billable orders this month" icon={Receipt}>
            Confirmed orders will appear grouped by customer.
          </Empty>
        )}
      </section>
    </>
  );
}
function Traceability() {
  const { user, connect } = useContext(Ctx);
  const [input, setInput] = useState(
      new URLSearchParams(location.search).get("id") || "",
    ),
    [query, setQuery] = useState(input);
  const q = useQuery({
    queryKey: ["traceability", query],
    queryFn: () => api("traceability/" + encodeURIComponent(query)),
    enabled: !!user && !!query,
  });
  const r = q.data?.record;
  const batches =
    q.data?.type === "order"
      ? r.items.flatMap((i: Row) =>
          i.allocations.map((a: Row) => ({
            batch: a.lot.harvest.batch,
            harvest: a.lot.harvest,
            packing: a.packing,
            customer: r.customer,
            grams: a.grams,
            status: r.status,
          })),
        )
      : r
        ? r.harvests.flatMap((h: Row) =>
            (h.inventory?.allocations || []).map((a: Row) => ({
              batch: r,
              harvest: h,
              packing: a.packing,
              customer: a.item.order.customer,
              grams: a.grams,
              status: a.item.order.status,
            })),
          )
        : [];
  return (
    <>
      <PageHeading
        eyebrow="SEED TO CUSTOMER"
        heading="Traceability"
        description="Find where an order came from, or where a growing batch went."
      />
      <section className="panel trace-search">
        <ShieldCheck size={32} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) return connect();
            setQuery(input);
          }}
        >
          <label>
            Order number, batch code or record ID
            <div className="trace-input">
              <input
                placeholder="Enter an order number or growing batch code"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
              />
              <button className="button primary">
                Trace record <ArrowRight size={16} />
              </button>
            </div>
          </label>
        </form>
      </section>
      {q.error && <p className="error">{q.error.message}</p>}
      {r ? (
        <section className="panel trace-results">
          <h2>{q.data.type === "order" ? r.number : r.code}</h2>
          <p>
            {batches.length} allocation records · Includes cancelled allocations
            for audit history
          </p>
          {!batches.length && (
            <Empty heading="No allocations yet">
              {q.data.type === "batch"
                ? `Seed lot ${r.seedLot.lotNumber} · Supplier ${r.seedLot.supplier.name}`
                : "Stock traceability appears after order confirmation."}
            </Empty>
          )}
          {batches.map((x: Row, i: number) => (
            <div className="trace-chain" key={i}>
              {[
                [Package, "Supplier", x.batch.seedLot.supplier.name],
                [Sprout, "Seed lot", x.batch.seedLot.lotNumber],
                [Layers, "Growing batch", x.batch.code],
                [Scissors, "Harvest", date(x.harvest.harvestedAt)],
                [
                  Box,
                  "Packed",
                  x.packing ? date(x.packing.packedAt) : "Not yet packed",
                ],
                [Users, "Customer", x.customer.name],
              ].map(([Icon, label, value]: any) => (
                <div key={label}>
                  <Icon size={19} />
                  <small>{label}</small>
                  <b>{value}</b>
                </div>
              ))}
              <span>
                {weight(x.grams)} · {title(x.status)}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <section className="panel">
          <Empty heading="A complete chain of custody" icon={ShieldCheck}>
            Supplier → Seed lot → Growing batch → Harvest → Packing → Customer
          </Empty>
        </section>
      )}
    </>
  );
}
function SettingsPage() {
  const { user, connect, notify } = useContext(Ctx);
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () => api("settings"),
    enabled: !!user,
  });
  const [name, setName] = useState(""),
    [address, setAddress] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (q.data) {
      setName(q.data.businessName || "");
      setAddress(q.data.farmAddress || "");
    }
  }, [q.data]);
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        heading="Settings"
        description="Business details, team access and operational history."
      />
      <div className="settings-grid">
        <section className="panel settings-form">
          <h2>Business identity</h2>
          <p>Used on public package traceability records.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return connect();
              try {
                await api("settings", {
                  method: "PATCH",
                  body: JSON.stringify({
                    businessName: name,
                    farmAddress: address,
                  }),
                });
                notify("Business details saved");
                qc.invalidateQueries({ queryKey: ["settings"] });
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            <label>
              Business name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your registered business name"
              />
            </label>
            <label>
              Farm address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Coimbatore, Tamil Nadu"
              />
            </label>
            <button className="button primary">Save details</button>
            {error && <p className="error">{error}</p>}
          </form>
        </section>
        <section className="panel settings-links">
          <Link to="/users">
            <span className="priority-icon green">
              <Users size={21} />
            </span>
            <span>
              <b>Team & access</b>
              <small>Manage staff accounts and roles</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/audit">
            <span className="priority-icon purple">
              <History size={21} />
            </span>
            <span>
              <b>Audit log</b>
              <small>Review important business changes</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/movements">
            <span className="priority-icon gold">
              <Layers size={21} />
            </span>
            <span>
              <b>Stock movements</b>
              <small>Inspect the inventory transaction ledger</small>
            </span>
            <ArrowRight size={18} />
          </Link>
          <div className="setting-note">
            <ShieldCheck size={20} />
            <p>
              Children's personal information is not collected. School programs
              use aggregate student and pack counts.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
