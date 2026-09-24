import Shop from "./Shop";
import StoreSettings from "./StoreSettings";
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
  Navigate,
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
import "./visualRefresh.css";
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
    <button data-testid={`icon-button-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
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
    <span data-testid="badge-span" className={"badge " + (value || "").toLowerCase()}>
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
    <dialog data-testid="modal-dialog"
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      aria-label={heading}
    >
      <header data-testid="modal-header">
        <h2 data-testid="modal-h2">{heading}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X data-testid="modal-x" size={20} />
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
    <div data-testid="empty-empty-div" className="empty">
      <div data-testid="empty-empty-icon-div" className="empty-icon">
        <Icon size={26} />
      </div>
      <h3 data-testid="empty-h3">{heading}</h3>
      <p data-testid="empty-p">{children}</p>
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
      <main data-testid="app-login-page-main" className="login-page">
        <LoaderCircle data-testid="app-loading-loader-circle" className="spin" aria-label="Loading" />
      </main>
    );
  if (user?.role === "GUEST") return <Navigate to="/shop" replace />;
  if (!user)
    return (
      <main data-testid="app-login-page-main-2" className="login-page">
        <div data-testid="app-login-brand-div" className="login-brand">
          <Sprout data-testid="app-sprout" size={38} />
          <h1 data-testid="app-kovai-greens-h1">Kovai Greens</h1>
          <p data-testid="app-fresh-growth-clear-operations-p">Fresh growth. Clear operations.</p>
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
      <div data-testid="app-app-div" className="app">
        <aside data-testid="app-aside" className={menu ? "sidebar open" : "sidebar"}>
          <Link data-testid="app--link" to="/" className="brand">
            <span data-testid="app-brand-icon-span" className="brand-icon">
              <Sprout data-testid="app-sprout-2" size={26} />
            </span>
            <span data-testid="app-kovai-span">
              Kovai<span data-testid="app-brand-light-span" className="brand-light">Greens</span>
              <small data-testid="app-farm-operations-small">FARM OPERATIONS</small>
            </span>
          </Link>
          <div data-testid="app-farm-div" className="farm">
            <span data-testid="app-farm-avatar-span" className="farm-avatar">KG</span>
            <span data-testid="app-span">
              <b data-testid="app-coimbatore-farm-b">Coimbatore farm</b>
              <small data-testid="app-tamil-nadu-india-small">
                <MapPin data-testid="app-map-pin" size={11} /> Tamil Nadu, India
              </small>
            </span>
            <ChevronDown data-testid="app-chevron-down" size={14} />
          </div>
          <nav data-testid="app-nav">
            {groups.map((g) => (
              <div data-testid={"app-nav-group-div" + "-" + String(g.name)} className="nav-group" key={g.name}>
                <p data-testid={"app-p" + "-" + String(g.name)}>{g.name}</p>
                {g.items
                  .filter(([p]) => allowed(p as string))
                  .map(([p, label, Icon]: any) => (
                    <NavLink data-testid={"app-nav-link" + "-" + String(p) + "-" + String(g.name)}
                      key={p}
                      to={p === "dashboard" ? "/" : "/" + p}
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                      end
                    >
                      <Icon size={18} />
                      <span data-testid={"app-span-2" + "-" + String(p) + "-" + String(g.name)}>{label}</span>
                      {p === "planning" && (
                        <span data-testid={"app-nav-tag-span" + "-" + String(p) + "-" + String(g.name)} className="nav-tag">PLAN</span>
                      )}
                    </NavLink>
                  ))}
              </div>
            ))}
          </nav>
          <div data-testid="app-sidebar-bottom-div" className="sidebar-bottom">
            {allowed("settings") && (
              <NavLink data-testid="app-settings-nav-link" className="nav-link" to="/settings">
                <Settings data-testid="app-settings" size={18} />
                Settings
              </NavLink>
            )}
            <button data-testid="app-profile-button"
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
              <span data-testid="app-avatar-span" className="avatar">
                {user ? user.name.slice(0, 2).toUpperCase() : "KG"}
              </span>
              <span data-testid="app-span-3">
                <b data-testid="app-b">{user?.name || "Your farm workspace"}</b>
                <small data-testid="app-small">
                  {user ? title(user.role) : "Sign in to get started"}
                </small>
              </span>
              {user ? <LogOut data-testid="app-log-out" size={16} /> : <ArrowRight data-testid="app-arrow-right" size={16} />}
            </button>
          </div>
        </aside>
        {menu && (
          <button data-testid="app-close-navigation-button"
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <div data-testid="app-workspace-div" className="workspace">
          <header data-testid="app-topbar-header" className="topbar">
            <div data-testid="app-breadcrumbs-div" className="breadcrumbs">
              <IconButton label="Open navigation" onClick={() => setMenu(true)}>
                <Menu data-testid="app-menu" size={20} />
              </IconButton>
              <span data-testid="app-workspace-span">Workspace</span>
              <ChevronRight data-testid="app-chevron-right" size={14} />
              <b data-testid="app-b-2">{current}</b>
            </div>
            <div data-testid="app-top-right-div" className="top-right">
              <a data-testid="app-button-a" href="/shop" className="button secondary">Customer store ↗</a>
              <span data-testid="app-location-span" className="location">
                <MapPin data-testid="app-map-pin-2" size={14} /> Coimbatore
              </span>
              <span data-testid="app-environment-span" className="environment">{user ? "Business workspace" : "Setup required"}</span>
              <button data-testid="app-account-and-password-button"
                className="avatar small"
                aria-label={user?.role === "ADMIN" ? "Account" : "Account and password"}
                disabled={user?.role === "ADMIN"}
                onClick={() =>
                  user ? setAccountOpen(true) : setConnecting(true)
                }
              >
                {user?.name?.slice(0, 2).toUpperCase() || "KG"}
              </button>
            </div>
          </header>
          <main data-testid="app-main">
            {!user && (
              <div data-testid="app-connection-banner-div" className="connection-banner">
                <span data-testid="app-sign-in-to-your-business-api-to-load-farm-records-span">
                  <Link2 data-testid="app-link2" size={17} />
                  <b data-testid="app-your-farm-workspace-b">Your farm workspace.</b> Sign in to your business API to
                  load farm records.
                </span>
                <button data-testid="app-sign-in-button" onClick={() => setConnecting(true)}>
                  Sign in <ArrowRight data-testid="app-arrow-right-2" size={15} />
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
                      <Link data-testid="app--link-2" to="/">Return to overview</Link>
                    </Empty>
                  }
                />
              </Routes>
            ) : (
              <Empty heading="This page is outside your role">
                <Link data-testid="app-open-your-workspace-link" to={"/" + (rolePages[user!.role]?.[0] || "dashboard")}>
                  Open your workspace
                </Link>
              </Empty>
            )}
            <footer data-testid="app-page-footer-footer" className="page-footer">
              <span data-testid="app-from-seed-to-doorstep-span">
                <Sprout data-testid="app-sprout-3" size={13} /> From seed to doorstep.
              </span>
              <span data-testid="app-weights-in-grams-currency-inr-asia-kolkata-span">Weights in grams · Currency INR · Asia/Kolkata</span>
            </footer>
          </main>
        </div>
        {toast && (
          <div data-testid="app-toast-div" className="toast" role="status">
            <CheckCircle2 data-testid="app-check-circle2" size={18} />
            {toast}
            <IconButton
              label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X data-testid="app-x" size={14} />
            </IconButton>
          </div>
        )}
        {accountOpen && user?.role !== "ADMIN" && <AccountDialog onClose={() => setAccountOpen(false)} />}
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
      <form data-testid="account-dialog-form"
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
        <p data-testid="account-dialog-form-intro-p" className="form-intro">
          {user?.name} · {title(user?.role)}. Changing your password signs out
          other sessions.
        </p>
        <label data-testid="account-dialog-current-password-label">
          Current password
          <input data-testid="account-dialog-current-password-input"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label data-testid="account-dialog-new-password-label">
          New password
          <input data-testid="account-dialog-new-password-input"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <small data-testid="account-dialog-use-at-least-12-characters-small">Use at least 12 characters.</small>
        </label>
        <label data-testid="account-dialog-confirm-new-password-label">
          Confirm new password
          <input data-testid="account-dialog-confirm-password-input"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        {error && (
          <p data-testid="account-dialog-error-p" className="error" role="alert">
            {error}
          </p>
        )}
        <div data-testid="account-dialog-dialog-footer-div" className="dialog-footer">
          <button data-testid="account-dialog-button-button"
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
          <button data-testid="account-dialog-button-button-2" className="button primary" disabled={busy}>
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
      <form data-testid="connect-form"
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
        <p data-testid="connect-form-intro-p" className="form-intro">
          Manage your farm, orders and deliveries in one place.
        </p>
        <label data-testid="connect-username-label">
          Username
          <input data-testid="connect-username-input"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label data-testid="connect-password-label">
          Password
          <input data-testid="connect-password-input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p data-testid="connect-error-p" className="error" role="alert">
            {error}
          </p>
        )}
        <div data-testid="connect-dialog-footer-div" className="dialog-footer">
          {!standalone && (
            <button data-testid="connect-button-button" type="button" className="button" onClick={onClose}>
              Cancel
            </button>
          )}
          <button data-testid="connect-button-button-2" className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle data-testid="connect-spin-loader-circle" className="spin" size={17} />
            ) : (
              <Link2 data-testid="connect-link2" size={17} />
            )}
            Sign in
          </button>
        </div>
      </form>
    </>
  );
  return standalone ? (
    <section data-testid="connect-login-card-section" className="login-card">
      <h2 data-testid="connect-sign-in-h2">Sign in</h2>
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
    <div data-testid="page-heading-page-heading-div" className="page-heading">
      <div data-testid="page-heading-div">
        <p data-testid="page-heading-eyebrow-p" className="eyebrow">{eyebrow}</p>
        <h1 data-testid="page-heading-h1">{heading}</h1>
        <p data-testid="page-heading-p">{description}</p>
      </div>
      <div data-testid="page-heading-heading-actions-div" className="heading-actions">{children}</div>
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
        <Link data-testid="dashboard-planning-link" to="/planning" className="button">
          <CalendarDays data-testid="dashboard-calendar-days" size={16} />
          Crop planning
        </Link>
        <button data-testid="dashboard-button-button"
          className="button primary"
          onClick={() =>
            user ? window.location.assign("/orders?new=1") : connect()
          }
        >
          <Plus data-testid="dashboard-plus" size={17} />
          New order
        </button>
      </PageHeading>
      <section data-testid="dashboard-farm-welcome-section" className="farm-welcome"><div data-testid="dashboard-farm-welcome-copy-div" className="farm-welcome-copy"><span data-testid="dashboard-welcome-label-span" className="welcome-label"><Sprout data-testid="dashboard-sprout" size={15}/> ROOTED IN COIMBATORE</span><h2 data-testid="dashboard-a-little-care-a-thriving-farm-h2">A little care.<br data-testid="dashboard-br"/>A thriving farm.</h2><p data-testid="dashboard-welcome-back-here-s-your-farm-from-the-next-harvest-to-the-next-doorstep-p">Welcome back{user?.name ? ', ' + user.name.split(' ')[0] : ''}. Here’s your farm, from the next harvest to the next doorstep.</p><div data-testid="dashboard-welcome-links-div" className="welcome-links"><Link data-testid="dashboard-batches-link" to="/batches">View growing batches <ArrowUpRight data-testid="dashboard-arrow-up-right" size={15}/></Link><a data-testid="dashboard-visit-customer-store-a" href="/shop">Visit customer store <ArrowUpRight data-testid="dashboard-arrow-up-right-2" size={15}/></a></div></div><div data-testid="dashboard-farm-welcome-photo-div" className="farm-welcome-photo"><img data-testid="dashboard-img" src="https://images.pexels.com/photos/9031151/pexels-photo-9031151.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Representative sunflower microgreens"/><span data-testid="dashboard-from-seed-to-doorstep-span"><Leaf data-testid="dashboard-leaf" size={14}/> From seed to doorstep</span></div></section>
      {q.error && (
        <div data-testid="dashboard-error-div" className="error">
          {q.error.message}
          <button data-testid="dashboard-retry-button" onClick={() => q.refetch()}>Retry</button>
        </div>
      )}
      <section data-testid="dashboard-metric-grid-section" className="metric-grid">
        {metrics.map((m) => (
          <Link data-testid={"dashboard-metric-link" + "-" + String(m.label)} className="metric" to={m.link} key={m.label}>
            <div data-testid={"dashboard-metric-top-div" + "-" + String(m.label)} className="metric-top">
              <span data-testid={"dashboard-span" + "-" + String(m.label)}>{m.label}</span>
              <m.icon data-testid={"dashboard-m-icon" + "-" + String(m.label)} size={19} />
            </div>
            <strong data-testid={"dashboard-strong" + "-" + String(m.label)}>{q.isLoading ? "…" : (m.value ?? "—")}</strong>
            <div data-testid={"dashboard-metric-bottom-div" + "-" + String(m.label)} className="metric-bottom">
              <span data-testid={"dashboard-span-2" + "-" + String(m.label)}>{m.detail}</span>
              <ArrowUpRight data-testid={"dashboard-arrow-up-right-3" + "-" + String(m.label)} size={16} />
            </div>
          </Link>
        ))}
      </section>
      <div data-testid="dashboard-operating-strip-div" className="operating-strip">
        {[
          ["Today's receipts", d ? money(d.todayRevenue) : "—"],
          ["Low-stock varieties", d?.lowInventory?.length ?? "—"],
          ["School deliveries this week", d?.upcomingSchools?.length ?? "—"],
          [
            "Recurring deliveries this week",
            d?.upcomingSubscriptions?.length ?? "—",
          ],
        ].map(([label, value]) => (
          <div data-testid={"dashboard-div" + "-" + String(String(label))} key={String(label)}>
            <span data-testid={"dashboard-span-3" + "-" + String(String(label))}>{label}</span>
            <b data-testid={"dashboard-b" + "-" + String(String(label))}>{value}</b>
          </div>
        ))}
      </div>
      {!!d?.overdueBatches?.length && (
        <div data-testid="dashboard-notice-div" className="notice">
          <AlertCircle data-testid="dashboard-alert-circle" size={18} />
          <span data-testid="dashboard-growing-batches-are-past-their-expected-harvest-date-check-the-crop-before--span">
            {d.overdueBatches.length} growing batches are past their expected
            harvest date. Check the crop before promising supply.
          </span>
          <Link data-testid="dashboard-batches-link-2" className="text-link" to="/batches">
            Review batches
          </Link>
        </div>
      )}
      <div data-testid="dashboard-dashboard-main-div" className="dashboard-main">
        <section data-testid="dashboard-panel-section" className="panel revenue">
          <div data-testid="dashboard-panel-heading-div" className="panel-heading">
            <div data-testid="dashboard-div-2">
              <h2 data-testid="dashboard-revenue-overview-h2">Revenue overview</h2>
              <p data-testid="dashboard-collected-payments-net-of-refunds-p">Collected payments, net of refunds</p>
            </div>
            <select data-testid="dashboard-revenue-period-select"
              aria-label="Revenue period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option data-testid="dashboard-last-6-months-option" value="6">Last 6 months</option>
              <option data-testid="dashboard-last-3-months-option" value="3">Last 3 months</option>
            </select>
          </div>
          <div data-testid="dashboard-revenue-number-div" className="revenue-number">
            {d ? money(d.monthlyRevenue) : "₹ —"}
            <span data-testid="dashboard-this-month-span">this month</span>
          </div>
          {d ? (
            <div data-testid="dashboard-chart-div" className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={d.monthly.slice(-Number(period))}
                  margin={{ left: 4, right: 15, top: 12, bottom: 0 }}
                >
                  <defs data-testid="dashboard-defs">
                    <linearGradient data-testid="dashboard-revenue-fill-linear-gradient"
                      id="revenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop data-testid="dashboard-stop"
                        offset="0%"
                        stopColor="#4e8e6f"
                        stopOpacity={0.25}
                      />
                      <stop data-testid="dashboard-stop-2" offset="100%" stopColor="#4e8e6f" stopOpacity={0} />
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
            <div data-testid="dashboard-chart-empty-div" className="chart-empty">
              <div data-testid="dashboard-chart-grid-div" className="chart-grid" />
              <span data-testid="dashboard-your-revenue-story-starts-with-your-first-payment-span">
                <BarChart3 data-testid="dashboard-bar-chart3" size={22} />
                Your revenue story starts with your first payment.
              </span>
              <div data-testid="dashboard-chart-months-div" className="chart-months">
                {Array.from({ length: 6 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 5 + i, 1);
                  return d.toLocaleString("en-IN", { month: "short" });
                }).map((s) => (
                  <span data-testid={"dashboard-span-4" + "-" + String(s)} key={s}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </section>
        <section data-testid="dashboard-panel-section-2" className="panel attention">
          <div data-testid="dashboard-panel-heading-div-2" className="panel-heading">
            <div data-testid="dashboard-div-3">
              <h2 data-testid="dashboard-farm-priorities-h2">Farm priorities</h2>
              <p data-testid="dashboard-what-needs-your-attention-p">What needs your attention</p>
            </div>
            <span data-testid="dashboard-subtle-icon-span" className="subtle-icon">
              <ClipboardList data-testid="dashboard-clipboard-list" size={18} />
            </span>
          </div>
          <Link data-testid="dashboard-harvests-link" className="priority" to="/harvests">
            <span data-testid="dashboard-priority-icon-span" className="priority-icon gold">
              <Sun data-testid="dashboard-sun" size={20} />
            </span>
            <span data-testid="dashboard-span-5">
              <b data-testid="dashboard-harvest-due-today-b">Harvest due today</b>
              <small data-testid="dashboard-small">
                {d
                  ? `${d.harvestToday} batches scheduled`
                  : "Check your harvest schedule"}
              </small>
            </span>
            <strong data-testid="dashboard-strong-2">{d?.harvestToday ?? "—"}</strong>
          </Link>
          <Link data-testid="dashboard-inventory-link" className="priority" to="/inventory">
            <span data-testid="dashboard-priority-icon-span-2" className="priority-icon orange">
              <Package data-testid="dashboard-package" size={20} />
            </span>
            <span data-testid="dashboard-span-6">
              <b data-testid="dashboard-available-stock-b">Available stock</b>
              <small data-testid="dashboard-unreserved-unpacked-produce-small">Unreserved, unpacked produce</small>
            </span>
            <strong data-testid="dashboard-strong-3">
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
          <Link data-testid="dashboard-payments-link" className="priority" to="/payments">
            <span data-testid="dashboard-priority-icon-span-3" className="priority-icon purple">
              <Wallet data-testid="dashboard-wallet" size={20} />
            </span>
            <span data-testid="dashboard-span-7">
              <b data-testid="dashboard-pending-payments-b">Pending payments</b>
              <small data-testid="dashboard-customer-balances-to-collect-small">Customer balances to collect</small>
            </span>
            <strong data-testid="dashboard-strong-4">{d ? money(d.pendingPayments) : "—"}</strong>
          </Link>
          <Link data-testid="dashboard-batches-link-3" className="priority" to="/batches">
            <span data-testid="dashboard-priority-icon-span-4" className="priority-icon green">
              <Sprout data-testid="dashboard-sprout-2" size={20} />
            </span>
            <span data-testid="dashboard-span-8">
              <b data-testid="dashboard-this-week-s-harvest-b">This week's harvest</b>
              <small data-testid="dashboard-plan-your-team-s-work-small">Plan your team's work</small>
            </span>
            <strong data-testid="dashboard-strong-5">{d?.harvestWeek ?? "—"}</strong>
          </Link>
          <Link data-testid="dashboard-planning-link-2" to="/planning" className="text-link full">
            Open production planner <ArrowRight data-testid="dashboard-arrow-right" size={16} />
          </Link>
        </section>
      </div>
      <div data-testid="dashboard-dashboard-lower-div" className="dashboard-lower">
        <section data-testid="dashboard-panel-section-3" className="panel">
          <div data-testid="dashboard-panel-heading-div-3" className="panel-heading">
            <div data-testid="dashboard-div-4">
              <h2 data-testid="dashboard-upcoming-deliveries-h2">Upcoming deliveries</h2>
              <p data-testid="dashboard-orders-scheduled-for-the-next-7-days-p">Orders scheduled for the next 7 days</p>
            </div>
            <Link data-testid="dashboard-deliveries-link" className="text-link" to="/deliveries">
              View all <ArrowUpRight data-testid="dashboard-arrow-up-right-4" size={15} />
            </Link>
          </div>
          {d?.orders?.length ? (
            <div data-testid="dashboard-simple-table-div" className="simple-table">
              <table data-testid="dashboard-table">
                <thead data-testid="dashboard-thead">
                  <tr data-testid="dashboard-tr">
                    <th data-testid="dashboard-customer-th">Customer</th>
                    <th data-testid="dashboard-order-th">Order</th>
                    <th data-testid="dashboard-delivery-th">Delivery</th>
                    <th data-testid="dashboard-status-th">Status</th>
                  </tr>
                </thead>
                <tbody data-testid="dashboard-tbody">
                  {d.orders.slice(0, 5).map((o: Row) => (
                    <tr data-testid={"dashboard-tr-2" + "-" + String(o.id)} key={o.id}>
                      <td data-testid={"dashboard-td" + "-" + String(o.id)}>
                        <b data-testid={"dashboard-b-2" + "-" + String(o.id)}>{o.customer.name}</b>
                        <small data-testid={"dashboard--small" + "-" + String(o.id)}>
                          {title(o.customer.type)} · {o.customer.area}
                        </small>
                      </td>
                      <td data-testid={"dashboard-td-2" + "-" + String(o.id)}>{o.number}</td>
                      <td data-testid={"dashboard-td-3" + "-" + String(o.id)}>{date(o.deliveryAt)}</td>
                      <td data-testid={"dashboard-td-4" + "-" + String(o.id)}>
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
        <section data-testid="dashboard-panel-section-4" className="panel harvest-card">
          <div data-testid="dashboard-panel-heading-div-4" className="panel-heading">
            <div data-testid="dashboard-div-5">
              <h2 data-testid="dashboard-growing-on-your-farm-h2">Growing on your farm</h2>
              <p data-testid="dashboard-from-sowing-to-harvest-p">From sowing to harvest</p>
            </div>
            <Sprout data-testid="dashboard-sprout-3" size={20} />
          </div>
          {d?.batches?.length ? (
            <div data-testid="dashboard-batch-list-div" className="batch-list">
              {d.batches.slice(0, 3).map((b: Row) => (
                <Link data-testid={"dashboard-batches-link-4" + "-" + String(b.id)} to="/batches" key={b.id}>
                  <span data-testid={"dashboard-crop-icon-span" + "-" + String(b.id)} className="crop-icon">
                    <Leaf data-testid={"dashboard-leaf-2" + "-" + String(b.id)} size={22} />
                  </span>
                  <span data-testid={"dashboard-span-9" + "-" + String(b.id)}>
                    <b data-testid={"dashboard-b-3" + "-" + String(b.id)}>{b.product.name}</b>
                    <small data-testid={"dashboard-trays-small" + "-" + String(b.id)}>
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
          <Link data-testid="dashboard-batches-link-5" className="text-link full" to="/batches">
            Manage growing batches <ArrowRight data-testid="dashboard-arrow-right-2" size={16} />
          </Link>
        </section>
      </div>
      <div data-testid="dashboard-quick-strip-div" className="quick-strip">
        <span data-testid="dashboard-span-10">
          <ShieldCheck data-testid="dashboard-shield-check" size={23} />
          <b data-testid="dashboard-every-harvest-has-a-story-b">Every harvest has a story.</b>
          <span data-testid="dashboard-follow-your-produce-from-seed-lot-to-customer-span">Follow your produce from seed lot to customer.</span>
        </span>
        <Link data-testid="dashboard-traceability-link" to="/traceability">
          Explore traceability <ArrowRight data-testid="dashboard-arrow-right-3" size={16} />
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
      <form data-testid={"record-form-form" + "-" + String(resource)} onSubmit={form.handleSubmit(submit)}>
        <div data-testid={"record-form-form-grid-div" + "-" + String(resource)} className="form-grid">
          {fs.map((f) => (
            <label data-testid={"record-form-label" + "-" + String(resource) + "-" + String(f.key)}
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
              {f.required && <em data-testid={"record-form--em" + "-" + String(resource) + "-" + String(f.key)}> *</em>}
              {f.type === "checkbox" ? (
                <input data-testid={"record-form-field" + "-" + String(resource) + "-" + String(f.key)}
                  className="form-checkbox"
                  type="checkbox"
                  {...form.register(f.key)}
                />
              ) : f.type === "weekdays" ? (
                <div data-testid={"record-form-weekday-picker-div" + "-" + String(resource) + "-" + String(f.key)} className="weekday-picker">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d, i) => (
                      <button data-testid={"record-form-button" + "-" + String(resource) + "-" + String(d) + "-" + String(f.key)}
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
                <select data-testid={"record-form-field" + "-" + String(resource) + "-" + String(f.key)} {...form.register(f.key)}>
                  <option data-testid={"record-form-select-option" + "-" + String(resource) + "-" + String(f.key)} value="">Select {f.label.toLowerCase()}</option>
                  {f.options?.map((s) => (
                    <option data-testid={"record-form-option" + "-" + String(resource) + "-" + String(s) + "-" + String(f.key)} key={s} value={s}>
                      {title(s)}
                    </option>
                  ))}
                  {f.source &&
                    options[f.source]?.map((s: Row) => (
                      <option data-testid={"record-form-option-2" + "-" + String(resource) + "-" + String(s.id) + "-" + String(f.key)} key={s.id} value={s.id}>
                        {s.name || s.code || s.number || s.lotNumber}
                      </option>
                    ))}
                </select>
              ) : (
                <input data-testid={"record-form-field" + "-" + String(resource) + "-" + String(f.key)}
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
              <small data-testid={"record-form-small" + "-" + String(resource) + "-" + String(f.key)}>{f.help}</small>
              {form.formState.errors[f.key] && (
                <span data-testid={"record-form-field-error-span" + "-" + String(resource) + "-" + String(f.key)} className="field-error">
                  {String(form.formState.errors[f.key]?.message)}
                </span>
              )}
            </label>
          ))}
        </div>
        {(refs.error || products.error) && (
          <p data-testid={"record-form-error-p" + "-" + String(resource)} className="error">
            Could not load form options.{" "}
            {refs.error?.message || products.error?.message}
          </p>
        )}
        {resource === "products" && (
          <div data-testid={"record-form-line-items-div" + "-" + String(resource)} className="line-items">
            <h3 data-testid={"record-form-selling-formats-h3" + "-" + String(resource)}>Selling formats</h3>
            {formats.map((f, i) => (
              <div data-testid={"record-form-format-row-div" + "-" + String(resource) + "-" + String(i)} className="format-row" key={i}>
                <label data-testid={"record-form-pack-weight-g-label" + "-" + String(resource) + "-" + String(i)}>
                  Pack weight (g)
                  <input data-testid={"record-form-f-grams-input" + "-" + String(resource) + "-" + String(i)}
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
                <label data-testid={"record-form-price-label" + "-" + String(resource) + "-" + String(i)}>
                  Price (₹)
                  <input data-testid={"record-form-f-price-paise-input" + "-" + String(resource) + "-" + String(i)}
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
                  <X data-testid={"record-form-x" + "-" + String(resource) + "-" + String(i)} size={16} />
                </IconButton>
              </div>
            ))}
            <button data-testid={"record-form-text-link-button" + "-" + String(resource)}
              type="button"
              className="text-link"
              onClick={() =>
                setFormats([...formats, { grams: 250, pricePaise: 0 }])
              }
            >
              <Plus data-testid={"record-form-plus" + "-" + String(resource)} size={15} />
              Add format
            </button>
          </div>
        )}
        {["orders", "schedules"].includes(resource) && (
          <div data-testid={"record-form-line-items-div-2" + "-" + String(resource)} className="line-items">
            <h3 data-testid={"record-form-h3" + "-" + String(resource)}>
              {resource === "orders" ? "Order items" : "Recurring products"}
            </h3>
            {items.map((item, i) => (
              <div data-testid={"record-form-item-row-div" + "-" + String(resource) + "-" + String(i)} key={i} className="item-row">
                <label data-testid={"record-form-product-label" + "-" + String(resource) + "-" + String(i)}>
                  Product
                  <select data-testid={"record-form-item-product-id-select" + "-" + String(resource) + "-" + String(i)}
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
                    <option data-testid={"record-form-select-product-option" + "-" + String(resource) + "-" + String(i)} value="">Select product</option>
                    {options.products.map((p: Row) => (
                      <option data-testid={"record-form-option-3" + "-" + String(resource) + "-" + String(p.id) + "-" + String(i)} key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label data-testid={"record-form-pack-g-label" + "-" + String(resource) + "-" + String(i)}>
                  Pack (g)
                  <select data-testid={"record-form-item-pack-grams-select" + "-" + String(resource) + "-" + String(i)}
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
                        <option data-testid={"record-form-g-option" + "-" + String(resource) + "-" + String(f.grams) + "-" + String(i)} key={f.grams} value={f.grams}>
                          {f.grams}g
                        </option>
                      ))}
                  </select>
                </label>
                <label data-testid={"record-form-packs-label" + "-" + String(resource) + "-" + String(i)}>
                  Packs
                  <input data-testid={"record-form-item-quantity-input" + "-" + String(resource) + "-" + String(i)}
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
                <label data-testid={"record-form-price-pack-label" + "-" + String(resource) + "-" + String(i)}>
                  Price / pack (₹)
                  <input data-testid={"record-form-item-unit-price-paise-input" + "-" + String(resource) + "-" + String(i)}
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
                  <X data-testid={"record-form-x-2" + "-" + String(resource) + "-" + String(i)} size={16} />
                </IconButton>
              </div>
            ))}
            <div data-testid={"record-form-spread-div" + "-" + String(resource)} className="spread">
              <button data-testid={"record-form-text-link-button-2" + "-" + String(resource)}
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
                <Plus data-testid={"record-form-plus-2" + "-" + String(resource)} size={15} />
                Add item
              </button>
              <b data-testid={"record-form-subtotal-b" + "-" + String(resource)}>
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
          <p data-testid={"record-form-error-p-2" + "-" + String(resource)} role="alert" className="error">
            {error}
          </p>
        )}
        <div data-testid={"record-form-dialog-footer-div" + "-" + String(resource)} className="dialog-footer">
          <button data-testid={"record-form-button-button" + "-" + String(resource)} type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button data-testid={"record-form-button-button-2" + "-" + String(resource)}
            className="button primary"
            disabled={busy || !!refs.error || !!products.error}
          >
            {busy ? (
              <LoaderCircle data-testid={"record-form-spin-loader-circle" + "-" + String(resource)} className="spin" size={16} />
            ) : (
              <Check data-testid={"record-form-check" + "-" + String(resource)} size={16} />
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
        <button data-testid={"records-button-button" + "-" + String(resource)}
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
          <ArrowDownToLine data-testid={"records-arrow-down-to-line" + "-" + String(resource)} size={16} />
          Export this page
        </button>
        {canCreate && (
          <button data-testid={"records-button-button-2" + "-" + String(resource)}
            className="button primary"
            onClick={() => (user ? setForm(true) : connect())}
          >
            <Plus data-testid={"records-plus" + "-" + String(resource)} size={17} />
            New {singular[page]}
          </button>
        )}
      </PageHeading>
      {resource === "seed-lots" && (
        <div data-testid={"records-tabs-div" + "-" + String(resource)} className="tabs">
          <Link data-testid={"records-seed-lots-link" + "-" + String(resource)} className="selected" to="/seed-lots">
            Seed inventory
          </Link>
          <Link data-testid={"records-suppliers-link" + "-" + String(resource)} to="/suppliers">Suppliers</Link>
        </div>
      )}
      {resource === "inventory" && (
        <div data-testid={"records-tabs-div-2" + "-" + String(resource)} className="tabs">
          <Link data-testid={"records-inventory-link" + "-" + String(resource)} className="selected" to="/inventory">
            Stock on hand
          </Link>
          <Link data-testid={"records-movements-link" + "-" + String(resource)} to="/movements">Transaction history</Link>
        </div>
      )}
      {resource === "schedules" && (
        <div data-testid={"records-notice-div" + "-" + String(resource)} className="notice">
          <Repeat data-testid={"records-repeat" + "-" + String(resource)} size={18} />
          <span data-testid={"records-generate-draft-orders-up-to-30-days-ahead-existing-schedule-dates-are-skipp-span" + "-" + String(resource)}>
            Generate draft orders up to 30 days ahead. Existing schedule dates
            are skipped.
          </span>
          <button data-testid={"records-text-link-button" + "-" + String(resource)}
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
            Generate orders <ArrowRight data-testid={"records-arrow-right" + "-" + String(resource)} size={15} />
          </button>
        </div>
      )}
      {resource === "payments" && (
        <div data-testid={"records-tabs-div-3" + "-" + String(resource)} className="tabs">
          <Link data-testid={"records-payments-link" + "-" + String(resource)} className="selected" to="/payments">
            Transactions
          </Link>
          <Link data-testid={"records-billing-link" + "-" + String(resource)} to="/billing">Monthly statements</Link>
        </div>
      )}
      {resource === "packing" && (
        <div data-testid={"records-notice-div-2" + "-" + String(resource)} className="notice">
          <Box data-testid={"records-box" + "-" + String(resource)} size={18} />
          <span data-testid={"records-packing-records-are-created-when-an-order-moves-from-packing-to-packed-span" + "-" + String(resource)}>
            Packing records are created when an order moves from Packing to
            Packed.
          </span>
          <Link data-testid={"records-orders-link" + "-" + String(resource)} className="text-link" to="/orders">
            Open orders <ArrowRight data-testid={"records-arrow-right-2" + "-" + String(resource)} size={15} />
          </Link>
        </div>
      )}
      <section data-testid={"records-panel-section" + "-" + String(resource)} className="panel records-panel">
        <div data-testid={"records-table-toolbar-div" + "-" + String(resource)} className="table-toolbar">
          <div data-testid={"records-search-input-div" + "-" + String(resource)} className="search-input">
            <Search data-testid={"records-search" + "-" + String(resource)} size={17} />
            <input data-testid={"records-search-input" + "-" + String(resource)}
              aria-label={`Search ${names[page]}`}
              placeholder={`Search ${names[page].toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div data-testid={"records-table-controls-div" + "-" + String(resource)} className="table-controls">
            <span data-testid={"records-records-span" + "-" + String(resource)}>{q.data?.total ?? 0} records</span>
            {statuses.length > 0 && (
              <select data-testid={"records-filter-status-select" + "-" + String(resource)}
                aria-label="Filter status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option data-testid={"records-all-statuses-option" + "-" + String(resource)} value="all">All statuses</option>
                {statuses.map((s) => (
                  <option data-testid={"records-option" + "-" + String(resource) + "-" + String(s)} key={s}>{s}</option>
                ))}
              </select>
            )}
            <IconButton
              label="Refresh records"
              onClick={() => (user ? q.refetch() : connect())}
            >
              <RefreshCw data-testid={"records-refresh-cw" + "-" + String(resource)} size={16} />
            </IconButton>
          </div>
        </div>
        {q.isLoading ? (
          <Empty heading="Loading records…" icon={LoaderCircle} />
        ) : q.error ? (
          <Empty heading="Records could not be loaded" icon={AlertCircle}>
            {q.error.message}
            <button data-testid={"records-button-button-3" + "-" + String(resource)} className="button" onClick={() => q.refetch()}>
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
              <button data-testid={"records-button-button-4" + "-" + String(resource)}
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
                <ArrowRight data-testid={"records-arrow-right-3" + "-" + String(resource)} size={15} />
              </button>
            }
          </Empty>
        ) : (
          <div data-testid={"records-grid-wrap-div" + "-" + String(resource)} className="grid-wrap">
            <React.Suspense fallback={<Empty heading="Loading table…" />}>
              <BusinessGrid
                gridId={`records-${resource}`}
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
        <div data-testid={"records-table-bottom-div" + "-" + String(resource)} className="table-bottom">
          <ShieldCheck data-testid={"records-shield-check" + "-" + String(resource)} size={14} />
          <span data-testid={"records-span" + "-" + String(resource)}>
            {resource === "inventory"
              ? "Stock changes are recorded in the inventory ledger."
              : "Select a row to view details and available actions."}
          </span>
          <span data-testid={"records-column-sorting-and-grid-filters-apply-to-this-page-span" + "-" + String(resource)}>Column sorting and grid filters apply to this page.</span>
        </div>
        <div data-testid={"records-server-pagination-div" + "-" + String(resource)} className="server-pagination">
          <label data-testid={"records-rows-per-page-label" + "-" + String(resource)}>
            Rows per page
            <select data-testid={"records-page-size-select" + "-" + String(resource)}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option data-testid={"records-20-option" + "-" + String(resource)} value={20}>20</option>
              <option data-testid={"records-50-option" + "-" + String(resource)} value={50}>50</option>
              <option data-testid={"records-100-option" + "-" + String(resource)} value={100}>100</option>
            </select>
          </label>
          <span data-testid={"records-page-of-span" + "-" + String(resource)}>
            Page {pageIndex} of{" "}
            {Math.max(1, Math.ceil((q.data?.total || 0) / pageSize))}
          </span>
          <button data-testid={"records-button-button-5" + "-" + String(resource)}
            className="button"
            disabled={pageIndex === 1 || q.isFetching}
            onClick={() => setPageIndex((p) => p - 1)}
          >
            <ChevronLeft data-testid={"records-chevron-left" + "-" + String(resource)} size={16} />
            Previous
          </button>
          <button data-testid={"records-button-button-6" + "-" + String(resource)}
            className="button"
            disabled={
              pageIndex * pageSize >= (q.data?.total || 0) || q.isFetching
            }
            onClick={() => setPageIndex((p) => p + 1)}
          >
            Next
            <ChevronRight data-testid={"records-chevron-right" + "-" + String(resource)} size={16} />
          </button>
        </div>
      </section>
      {error && !selected && <p data-testid={"records-error-p" + "-" + String(resource)} className="error">{error}</p>}
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
          <div data-testid={"records-detail-summary-div" + "-" + String(resource)} className="detail-summary">
            {cols.map((c) => (
              <div data-testid={"records-div" + "-" + String(resource) + "-" + String(c.headerName)} key={c.headerName}>
                <span data-testid={"records-span-2" + "-" + String(resource) + "-" + String(c.headerName)}>{c.headerName}</span>
                <b data-testid={"records-b" + "-" + String(resource) + "-" + String(c.headerName)}>{String(c.valueGetter({ data: selected }) ?? "—")}</b>
              </div>
            ))}
          </div>
          {["batches", "orders"].includes(resource) && (
            <RecordHistory resource={resource} id={selected.id} />
          )}
          {resource === "orders" && (
            <>
              <h3 data-testid={"records-order-items-h3" + "-" + String(resource)}>Order items</h3>
              {selected.items.map((i: Row) => (
                <div data-testid={"records-detail-line-div" + "-" + String(resource) + "-" + String(i.id)} className="detail-line" key={i.id}>
                  <span data-testid={"records-g-span" + "-" + String(resource) + "-" + String(i.id)}>
                    {i.product.name} · {i.quantity} × {i.packGrams}g
                  </span>
                  <b data-testid={"records-b-2" + "-" + String(resource) + "-" + String(i.id)}>{money(i.quantity * i.unitPricePaise)}</b>
                </div>
              ))}
              <div data-testid={"records-detail-line-div-2" + "-" + String(resource)} className="detail-line">
                <span data-testid={"records-outstanding-balance-span" + "-" + String(resource)}>Outstanding balance</span>
                <b data-testid={"records-b-3" + "-" + String(resource)}>{money(selected.totalPaise - selected.paidPaise)}</b>
              </div>
              {user && ['OWNER','ADMIN','SALES'].includes(user.role) && <OrderPaymentConfirmation key={selected.id} order={selected} onSaved={() => { saved(); setSelected(null); }}/>}

              <Link data-testid={"records-text-link-link" + "-" + String(resource)}
                className="text-link"
                to={"/traceability?id=" + selected.id}
              >
                View batch traceability <ArrowRight data-testid={"records-arrow-right-4" + "-" + String(resource)} size={15} />
              </Link>
            </>
          )}
          {resource === "audit" && (
            <pre data-testid={"records-json-detail-pre" + "-" + String(resource)} className="json-detail">
              {JSON.stringify(
                { before: selected.oldValue, after: selected.newValue },
                null,
                2,
              )}
            </pre>
          )}
          {resource === "payments" && (
            <div data-testid={"records-tabs-div-4" + "-" + String(resource)} className="tabs">
              <Link data-testid={"records-payments-link-2" + "-" + String(resource)} className="selected" to="/payments">
                Transactions
              </Link>
              <Link data-testid={"records-billing-link-2" + "-" + String(resource)} to="/billing">Monthly statements</Link>
            </div>
          )}
          {resource === "packing" && selected.status !== "CANCELLED" && (
            <PackingLabel id={selected.id} />
          )}
          {resource === "deliveries" && (
            <DeliveryForm record={selected} onSubmit={mutate} busy={busy} />
          )}
          <div data-testid={"records-action-row-div" + "-" + String(resource)} className="action-row">
            {["products", "customers", "suppliers"].includes(resource) &&
              !(
                resource === "products" &&
                user &&
                ["SALES", "FARM_WORKER"].includes(user.role)
              ) && (
                <button data-testid={"records-button-button-7" + "-" + String(resource)}
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
                <button data-testid={"records-button" + "-" + String(resource) + "-" + String(s)}
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
                <label data-testid={"records-role-label" + "-" + String(resource)}>
                  Role
                  <select data-testid={"records-selected-role-select" + "-" + String(resource)}
                    value={selected.role}
                    disabled={busy}
                    onChange={(e) => mutate({ role: e.target.value })}
                  >
                    {[
                      "OWNER",
                      "ADMIN",
                      "GUEST",
                      "PRODUCTION_MANAGER",
                      "FARM_WORKER",
                      "SALES",
                      "DELIVERY",
                    ].map((role) => (
                      <option data-testid={"records-option-2" + "-" + String(resource) + "-" + String(role)} key={role} value={role}>
                        {title(role)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            {resource === "users" &&
              user?.role === "OWNER" &&
              selected.id !== user.id && (
                <button data-testid={"records-button-button-8" + "-" + String(resource)}
                  className="button danger"
                  onClick={() => mutate({ active: !selected.active })}
                >
                  {selected.active ? "Deactivate user" : "Reactivate user"}
                </button>
              )}
          </div>
          {error && (
            <p data-testid={"records-error-p-2" + "-" + String(resource)} role="alert" className="error">
              {error}
            </p>
          )}
          {confirm && (
            <div data-testid={"records-confirmation-div" + "-" + String(resource)} className="confirmation">
              <b data-testid={"records-change-this-to-b" + "-" + String(resource)}>
                Change this {singular[resource] || "record"} to {title(confirm)}
                ?
              </b>
              <p data-testid={"records-p" + "-" + String(resource)}>
                {resource === "orders"
                  ? "This may reserve, release or move inventory. The change will be recorded."
                  : "This change will be recorded in the audit log."}
              </p>
              <div data-testid={"records-action-row-div-2" + "-" + String(resource)} className="action-row">
                <button data-testid={"records-button-button-9" + "-" + String(resource)} className="button" onClick={() => setConfirm(null)}>
                  Keep current status
                </button>
                <button data-testid={"records-button-button-10" + "-" + String(resource)}
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
    <section data-testid={"record-history-record-history-section" + "-" + String(resource + "-" + id)} className="record-history">
      <h3 data-testid={"record-history-timeline-h3" + "-" + String(resource + "-" + id)}>Timeline</h3>
      {q.error ? (
        <p data-testid={"record-history-error-p" + "-" + String(resource + "-" + id)} className="error">{q.error.message}</p>
      ) : (
        q.data?.map((r: Row) => (
          <div data-testid={"record-history-div" + "-" + String(resource + "-" + id) + "-" + String(r.id)} key={r.id}>
            <span data-testid={"record-history-timeline-mark-span" + "-" + String(resource + "-" + id) + "-" + String(r.id)} className="timeline-mark" />
            <p data-testid={"record-history-p" + "-" + String(resource + "-" + id) + "-" + String(r.id)}>
              <b data-testid={"record-history-b" + "-" + String(resource + "-" + id) + "-" + String(r.id)}>{title(r.action)}</b>
              {r.newValue?.status && <Badge value={r.newValue.status} />}
              <small data-testid={"record-history--small" + "-" + String(resource + "-" + id) + "-" + String(r.id)}>
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
    <div data-testid={"packing-label-packing-label-container-div" + "-" + String(id)} className="packing-label-container">
      <button data-testid={"packing-label-button-button" + "-" + String(id)} className="button" onClick={() => setOpened(true)}>
        <ShieldCheck data-testid={"packing-label-shield-check" + "-" + String(id)} size={16} />
        Show QR label
      </button>
      {q.error && <p data-testid={"packing-label-error-p" + "-" + String(id)} className="error">{q.error.message}</p>}
      {q.data && (
        <>
          <div data-testid={"packing-label-print-label-div" + "-" + String(id)} className="package-label" id="print-label">
            <div data-testid={"packing-label-div" + "-" + String(id)}>
              <h2 data-testid={"packing-label-h2" + "-" + String(id)}>{q.data.farm}</h2>
              <h3 data-testid={"packing-label-g-h3" + "-" + String(id)}>
                {q.data.product} · {q.data.packGrams}g
              </h3>
              <p data-testid={"packing-label-batch-p" + "-" + String(id)}>Batch: {q.data.batch}</p>
              <p data-testid={"packing-label-harvested-p" + "-" + String(id)}>Harvested: {date(q.data.harvestedAt)}</p>
              <p data-testid={"packing-label-packed-p" + "-" + String(id)}>Packed: {date(q.data.packedAt)}</p>
              {q.data.bestBefore && (
                <p data-testid={"packing-label-best-before-p" + "-" + String(id)}>Best before: {date(q.data.bestBefore)}</p>
              )}
              <p data-testid={"packing-label-p" + "-" + String(id)}>{q.data.storageInstructions}</p>
              <small data-testid={"packing-label-small" + "-" + String(id)}>{q.data.address}</small>
            </div>
            <img data-testid={"packing-label-img" + "-" + String(id)}
              width="128"
              height="128"
              src={q.data.qrDataUrl}
              alt="Scan for this package's harvest and farm information"
            />
          </div>
          <div data-testid={"packing-label-action-row-div" + "-" + String(id)} className="action-row">
            <a data-testid={"packing-label-button-a" + "-" + String(id)}
              className="button"
              href={q.data.traceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Public package page <ArrowUpRight data-testid={"packing-label-arrow-up-right" + "-" + String(id)} size={16} />
            </a>
            <button data-testid={"packing-label-button-button-2" + "-" + String(id)} className="button primary" onClick={() => window.print()}>
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
    <div data-testid={"delivery-form-delivery-form-div" + "-" + String(record.id)} className="delivery-form">
      <p data-testid={"delivery-form-p" + "-" + String(record.id)}>{record.address}</p>
      {user?.role !== "DELIVERY" && (
        <div data-testid={"delivery-form-form-grid-div" + "-" + String(record.id)} className="form-grid">
          <label data-testid={"delivery-form-driver-optional-label" + "-" + String(record.id)}>
            Driver (optional)
            {users.data ? (
              <select data-testid={"delivery-form-driver-select" + "-" + String(record.id)}
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              >
                <option data-testid={"delivery-form-no-driver-assigned-option" + "-" + String(record.id)} value="">No driver assigned</option>
                {users.data.data
                  .filter((u: Row) => !!u.id)
                  .map((u: Row) => (
                    <option data-testid={"delivery-form-option" + "-" + String(record.id) + "-" + String(u.id)} key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            ) : (
              <input data-testid={"delivery-form-driver-user-id-input" + "-" + String(record.id)}
                placeholder="Driver user ID"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              />
            )}
          </label>
          <label data-testid={"delivery-form-route-label" + "-" + String(record.id)}>
            Route
            <input data-testid={"delivery-form-route-input" + "-" + String(record.id)} value={route} onChange={(e) => setRoute(e.target.value)} />
          </label>
          <label data-testid={"delivery-form-vehicle-label" + "-" + String(record.id)}>
            Vehicle
            <input data-testid={"delivery-form-vehicle-input" + "-" + String(record.id)}
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </label>
        </div>
      )}
      {user?.role !== "DELIVERY" && (
        <div data-testid={"delivery-form-form-grid-div-2" + "-" + String(record.id)} className="form-grid">
          <label data-testid={"delivery-form-delivery-date-and-time-ist-label" + "-" + String(record.id)}>
            Delivery date and time (IST)
            <input data-testid={"delivery-form-delivery-at-input" + "-" + String(record.id)}
              type="datetime-local"
              value={deliveryAt}
              onChange={(e) => setDeliveryAt(e.target.value)}
            />
          </label>
          <label data-testid={"delivery-form-delivery-time-slot-label" + "-" + String(record.id)}>
            Delivery time slot
            <input data-testid={"delivery-form-e-g-7-00-9-00-am-input" + "-" + String(record.id)}
              placeholder="e.g. 7:00–9:00 AM"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            />
          </label>
        </div>
      )}
      <label data-testid={"delivery-form-delivery-notes-label" + "-" + String(record.id)}>
        Delivery notes
        <input data-testid={"delivery-form-notes-input" + "-" + String(record.id)} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div data-testid={"delivery-form-action-row-div" + "-" + String(record.id)} className="action-row">
        {user?.role !== "DELIVERY" &&
          !["CANCELLED", "DELIVERED"].includes(record.status) && (
            <button data-testid={"delivery-form-button-button" + "-" + String(record.id)}
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
            <button data-testid={"delivery-form-button-button-2" + "-" + String(record.id)}
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
          <button data-testid={"delivery-form-button-button-3" + "-" + String(record.id)}
            className="button primary"
            disabled={busy}
            onClick={() => onSubmit({ status: "DELIVERED", notes })}
          >
            Mark delivered
          </button>
        )}
        {record.status === "OUT_FOR_DELIVERY" && (
          <button data-testid={"delivery-form-button-button-4" + "-" + String(record.id)}
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
        <button data-testid={"discard-button-button" + "-" + String(record.id)} className="button danger" onClick={() => setOpen(true)}>
          Discard stock
        </button>
      ) : (
        <form data-testid={"discard-discard-form-form" + "-" + String(record.id)}
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
          <label data-testid={"discard-discard-quantity-g-label" + "-" + String(record.id)}>
            Discard quantity (g)
            <input data-testid={"discard-grams-input" + "-" + String(record.id)}
              type="number"
              min="1"
              required
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </label>
          <label data-testid={"discard-reason-label" + "-" + String(record.id)}>
            Reason
            <input data-testid={"discard-reason-input" + "-" + String(record.id)}
              minLength={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button data-testid={"discard-button-button-2" + "-" + String(record.id)} className="button danger" disabled={busy}>
            Confirm discard
          </button>
          {error && <p data-testid={"discard-error-p" + "-" + String(record.id)} className="error">{error}</p>}
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
        <select data-testid="planning-planning-horizon-select"
          aria-label="Planning horizon"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option data-testid="planning-next-7-days-option" value={7}>Next 7 days</option>
          <option data-testid="planning-next-14-days-option" value={14}>Next 14 days</option>
          <option data-testid="planning-next-30-days-option" value={30}>Next 30 days</option>
        </select>
        <Link data-testid="planning-batches-new-1-link" className="button primary" to="/batches?new=1">
          <Plus data-testid="planning-plus" size={16} />
          Plan a batch
        </Link>
      </PageHeading>
      <div data-testid="planning-planning-explainer-div" className="planning-explainer">
        <div data-testid="planning-div">
          <span data-testid="planning-priority-icon-span" className="priority-icon green">
            <CalendarDays data-testid="planning-calendar-days" size={24} />
          </span>
          <h2 data-testid="planning-the-right-crop-at-the-right-time-h2">The right crop. At the right time.</h2>
          <p data-testid="planning-unreserved-demand-includes-draft-orders-school-programs-and-active-subscrip-p">
            Unreserved demand includes draft orders, school programs and active
            subscriptions. Confirmed orders already hold stock. Supply is
            matched by harvest and delivery date, with expired stock excluded.
          </p>
        </div>
        <div data-testid="planning-formula-div" className="formula">
          <span data-testid="planning-upcoming-demand-span">Upcoming demand</span>
          <span data-testid="planning-available-harvests-growing-batches-span">− Available harvests & growing batches</span>
          <strong data-testid="planning-additional-trays-to-sow-strong">= Additional trays to sow</strong>
        </div>
      </div>
      {!!q.data?.length && (
        <section data-testid="planning-panel-section" className="panel report-chart">
          <h2 data-testid="planning-production-and-unreserved-demand-kg-h2">Production and unreserved demand (kg)</h2>
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
      <section data-testid="planning-panel-section-2" className="panel">
        <div data-testid="planning-panel-heading-div" className="panel-heading">
          <div data-testid="planning-div-2">
            <h2 data-testid="planning-production-recommendations-h2">Production recommendations</h2>
            <p data-testid="planning-expected-yields-are-estimates-confirm-quality-and-actual-harvest-quantities-p">
              Expected yields are estimates; confirm quality and actual harvest
              quantities.
            </p>
          </div>
          <span data-testid="planning-badge-span" className="badge">{days}-day horizon</span>
        </div>
        {q.error ? (
          <Empty heading="Could not load planning" icon={AlertCircle}>
            {q.error.message}
          </Empty>
        ) : q.data?.length ? (
          <div data-testid="planning-planning-list-div" className="planning-list">
            {q.data.map((p: Row) => (
              <div data-testid={"planning-plan-row-div" + "-" + String(p.product.id)} className="plan-row" key={p.product.id}>
                <span data-testid={"planning-crop-icon-span" + "-" + String(p.product.id)} className="crop-icon">
                  <Leaf data-testid={"planning-leaf" + "-" + String(p.product.id)} size={25} />
                </span>
                <div data-testid={"planning-plan-name-div" + "-" + String(p.product.id)} className="plan-name">
                  <h3 data-testid={"planning-h3" + "-" + String(p.product.id)}>{p.product.name}</h3>
                  <small data-testid={"planning-growing-days-g-per-tray-small" + "-" + String(p.product.id)}>
                    {p.product.growingDays} growing days ·{" "}
                    {p.product.yieldGramsPerTray}g per tray
                  </small>
                </div>
                <div data-testid={"planning-div-3" + "-" + String(p.product.id)}>
                  <small data-testid={"planning-demand-small" + "-" + String(p.product.id)}>Demand</small>
                  <b data-testid={"planning-b" + "-" + String(p.product.id)}>{weight(p.demandGrams)}</b>
                </div>
                <div data-testid={"planning-div-4" + "-" + String(p.product.id)}>
                  <small data-testid={"planning-in-stock-small" + "-" + String(p.product.id)}>In stock</small>
                  <b data-testid={"planning-b-2" + "-" + String(p.product.id)}>{weight(p.stockGrams)}</b>
                </div>
                <div data-testid={"planning-div-5" + "-" + String(p.product.id)}>
                  <small data-testid={"planning-growing-small" + "-" + String(p.product.id)}>Growing</small>
                  <b data-testid={"planning-b-3" + "-" + String(p.product.id)}>{weight(p.growingGrams)}</b>
                </div>
                <div data-testid={"planning-plan-advice-div" + "-" + String(p.product.id)} className="plan-advice">
                  {p.additionalTrays ? (
                    <>
                      <b data-testid={"planning-plant-trays-b" + "-" + String(p.product.id)}>Plant {p.additionalTrays} trays</b>
                      <small data-testid={"planning-by-small" + "-" + String(p.product.id)}
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
              <button data-testid="planning-button-button" className="button primary" onClick={connect}>
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
        <label data-testid="reports-date-filter-label" className="date-filter">
          From
          <input data-testid="reports-report-start-date-input"
            aria-label="Report start date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label data-testid="reports-date-filter-label-2" className="date-filter">
          To
          <input data-testid="reports-report-end-date-input"
            aria-label="Report end date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button data-testid="reports-button-button"
          className="button"
          disabled={!exportRows.length}
          onClick={() => csv("kovai-" + tab, exportRows)}
        >
          <ArrowDownToLine data-testid="reports-arrow-down-to-line" size={16} />
          Export CSV
        </button>
      </PageHeading>
      <section data-testid="reports-metric-grid-section" className="metric-grid report-metrics">
        {[
          ["Order value", d?.salesPaise],
          ["Net receipts", d?.cashCollectedPaise],
          ["Recorded expenses", d?.expensesPaise],
          [
            "Cash surplus",
            d ? d.cashCollectedPaise - d.expensesPaise : undefined,
          ],
        ].map(([label, value]) => (
          <div data-testid={"reports-metric-div" + "-" + String(label as string)} className="metric" key={label as string}>
            <span data-testid={"reports-span" + "-" + String(label as string)}>{label}</span>
            <strong data-testid={"reports-strong" + "-" + String(label as string)}>
              {value === undefined ? "—" : money(value as number)}
            </strong>
          </div>
        ))}
      </section>
      <div data-testid="reports-notice-div" className="notice">
        <AlertCircle data-testid="reports-alert-circle" size={17} />
        <span data-testid="reports-cash-surplus-is-net-receipts-minus-recorded-expenses-production-cost-and-es-span">
          Cash surplus is net receipts minus recorded expenses. Production cost
          and estimated gross profit use seed consumption and explicitly
          allocated batch expenses.
        </span>
      </div>
      {agg.length > 0 && (
        <section data-testid="reports-panel-section" className="panel report-chart">
          <h2 data-testid="reports-sales-by-variety-h2">Sales by variety</h2>
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
        <section data-testid="reports-panel-section-2" className="panel report-chart">
          <h2 data-testid="reports-orders-by-customer-type-h2">Orders by customer type</h2>
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
        <div data-testid="reports-report-chart-grid-div" className="report-chart-grid">
          <section data-testid="reports-panel-section-3" className="panel report-chart">
            <h2 data-testid="reports-harvest-yield-kg-h2">Harvest yield (kg)</h2>
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
          <section data-testid="reports-panel-section-4" className="panel report-chart">
            <h2 data-testid="reports-harvest-wastage-h2">Harvest wastage (%)</h2>
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
          <div data-testid="reports-operating-strip-div" className="operating-strip">
            {[
              ["Delivered sales, excl. tax", d.deliveredNetSalesPaise],
              ["Allocated production cost", d.deliveredCostPaise],
              ["Estimated gross profit", d.estimatedGrossProfitPaise],
            ].map(([label, value]) => (
              <div data-testid={"reports-div" + "-" + String(String(label))} key={String(label)}>
                <span data-testid={"reports-span-2" + "-" + String(String(label))}>{label}</span>
                <b data-testid={"reports-b" + "-" + String(String(label))}>{money(Number(value))}</b>
              </div>
            ))}
          </div>
          <div data-testid="reports-notice-div-2" className="notice">
            <AlertCircle data-testid="reports-alert-circle-2" size={18} />
            <span data-testid="reports-margin-covers-delivered-orders-created-in-this-reporting-period-costs-inclu-span">
              Margin covers delivered orders created in this reporting period.
              Costs include consumed seeds and expenses explicitly assigned to
              their growing batches, apportioned over usable harvest.
              Unallocated overhead, inventory write-offs and returns are
              excluded.
            </span>
          </div>
        </>
      )}
      <section data-testid="reports-panel-section-5" className="panel">
        <div data-testid="reports-tabs-div" className="tabs padded">
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
            <button data-testid={"reports-button" + "-" + String(key)}
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
          <div data-testid="reports-simple-table-div" className="simple-table">
            <table data-testid="reports-table">
              <thead data-testid="reports-thead">
                <tr data-testid="reports-tr">
                  {Object.keys(exportRows[0]).map((k) => (
                    <th data-testid={"reports-th" + "-" + String(k)} key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody data-testid="reports-tbody">
                {exportRows.map((r, i) => (
                  <tr data-testid={"reports-tr-2" + "-" + String(i)} key={i}>
                    {Object.values(r).map((v, j) => (
                      <td data-testid={"reports-td" + "-" + String(j) + "-" + String(i)} key={j}>{String(v ?? "")}</td>
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
        <input data-testid="billing-statement-month-input"
          type="month"
          aria-label="Statement month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button data-testid="billing-button-button"
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
          <ArrowDownToLine data-testid="billing-arrow-down-to-line" size={16} />
          Export CSV
        </button>
      </PageHeading>
      <div data-testid="billing-tabs-div" className="tabs">
        <Link data-testid="billing-payments-link" to="/payments">Transactions</Link>
        <Link data-testid="billing-billing-link" to="/billing" className="selected">
          Monthly statements
        </Link>
      </div>
      <div data-testid="billing-notice-div" className="notice">
        <Receipt data-testid="billing-receipt" size={18} />
        <span data-testid="billing-these-are-account-statements-not-tax-invoices-payments-reflect-current-net--span">
          These are account statements, not tax invoices. Payments reflect
          current net receipts, including refunds.
        </span>
      </div>
      {q.error && <p data-testid="billing-error-p" className="error">{q.error.message}</p>}
      <section data-testid="billing-panel-section" className="panel">
        {rows.length ? (
          <div data-testid="billing-simple-table-div" className="simple-table">
            <table data-testid="billing-table">
              <thead data-testid="billing-thead">
                <tr data-testid="billing-tr">
                  <th data-testid="billing-customer-th">Customer</th>
                  <th data-testid="billing-type-th">Type</th>
                  <th data-testid="billing-orders-th">Orders</th>
                  <th data-testid="billing-order-value-th">Order value</th>
                  <th data-testid="billing-paid-th">Paid</th>
                  <th data-testid="billing-outstanding-th">Outstanding</th>
                </tr>
              </thead>
              <tbody data-testid="billing-tbody">
                {rows.map((r: Row) => (
                  <tr data-testid={"billing-tr-2" + "-" + String(r.customer.id)} key={r.customer.id}>
                    <td data-testid={"billing-td" + "-" + String(r.customer.id)}>{r.customer.name}</td>
                    <td data-testid={"billing-td-2" + "-" + String(r.customer.id)}>{title(r.customer.type)}</td>
                    <td data-testid={"billing-td-3" + "-" + String(r.customer.id)}>{r.orders.length}</td>
                    <td data-testid={"billing-td-4" + "-" + String(r.customer.id)}>{money(r.invoiceAmountPaise)}</td>
                    <td data-testid={"billing-td-5" + "-" + String(r.customer.id)}>{money(r.amountPaidPaise)}</td>
                    <td data-testid={"billing-td-6" + "-" + String(r.customer.id)}>{money(r.outstandingPaise)}</td>
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
      <section data-testid="traceability-panel-section" className="panel trace-search">
        <ShieldCheck data-testid="traceability-shield-check" size={32} />
        <form data-testid="traceability-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) return connect();
            setQuery(input);
          }}
        >
          <label data-testid="traceability-order-number-batch-code-or-record-id-label">
            Order number, batch code or record ID
            <div data-testid="traceability-trace-input-div" className="trace-input">
              <input data-testid="traceability-enter-an-order-number-or-growing-batch-code-input"
                placeholder="Enter an order number or growing batch code"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
              />
              <button data-testid="traceability-button-button" className="button primary">
                Trace record <ArrowRight data-testid="traceability-arrow-right" size={16} />
              </button>
            </div>
          </label>
        </form>
      </section>
      {q.error && <p data-testid="traceability-error-p" className="error">{q.error.message}</p>}
      {r ? (
        <section data-testid="traceability-panel-section-2" className="panel trace-results">
          <h2 data-testid="traceability-h2">{q.data.type === "order" ? r.number : r.code}</h2>
          <p data-testid="traceability-allocation-records-includes-cancelled-allocations-for-audit-history-p">
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
            <div data-testid={"traceability-trace-chain-div" + "-" + String(i)} className="trace-chain" key={i}>
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
                <div data-testid={"traceability-div" + "-" + String(label) + "-" + String(i)} key={label}>
                  <Icon size={19} />
                  <small data-testid={"traceability-small" + "-" + String(label) + "-" + String(i)}>{label}</small>
                  <b data-testid={"traceability-b" + "-" + String(label) + "-" + String(i)}>{value}</b>
                </div>
              ))}
              <span data-testid={"traceability--span" + "-" + String(i)}>
                {weight(x.grams)} · {title(x.status)}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <section data-testid="traceability-panel-section-3" className="panel">
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
      <div data-testid="settings-page-settings-grid-div" className="settings-grid">
        <StoreSettings />
        <section data-testid="settings-page-panel-section" className="panel settings-form">
          <h2 data-testid="settings-page-business-identity-h2">Business identity</h2>
          <p data-testid="settings-page-used-on-public-package-traceability-records-p">Used on public package traceability records.</p>
          <form data-testid="settings-page-form"
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
            <label data-testid="settings-page-business-name-label">
              Business name
              <input data-testid="settings-page-your-registered-business-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your registered business name"
              />
            </label>
            <label data-testid="settings-page-farm-address-label">
              Farm address
              <textarea data-testid="settings-page-coimbatore-tamil-nadu-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Coimbatore, Tamil Nadu"
              />
            </label>
            <button data-testid="settings-page-button-button" className="button primary">Save details</button>
            {error && <p data-testid="settings-page-error-p" className="error">{error}</p>}
          </form>
        </section>
        <section data-testid="settings-page-panel-section-2" className="panel settings-links">
          <Link data-testid="settings-page-users-link" to="/users">
            <span data-testid="settings-page-priority-icon-span" className="priority-icon green">
              <Users data-testid="settings-page-users" size={21} />
            </span>
            <span data-testid="settings-page-span">
              <b data-testid="settings-page-team-access-b">Team & access</b>
              <small data-testid="settings-page-manage-staff-accounts-and-roles-small">Manage staff accounts and roles</small>
            </span>
            <ArrowRight data-testid="settings-page-arrow-right" size={18} />
          </Link>
          <Link data-testid="settings-page-audit-link" to="/audit">
            <span data-testid="settings-page-priority-icon-span-2" className="priority-icon purple">
              <History data-testid="settings-page-history" size={21} />
            </span>
            <span data-testid="settings-page-span-2">
              <b data-testid="settings-page-audit-log-b">Audit log</b>
              <small data-testid="settings-page-review-important-business-changes-small">Review important business changes</small>
            </span>
            <ArrowRight data-testid="settings-page-arrow-right-2" size={18} />
          </Link>
          <Link data-testid="settings-page-movements-link" to="/movements">
            <span data-testid="settings-page-priority-icon-span-3" className="priority-icon gold">
              <Layers data-testid="settings-page-layers" size={21} />
            </span>
            <span data-testid="settings-page-span-3">
              <b data-testid="settings-page-stock-movements-b">Stock movements</b>
              <small data-testid="settings-page-inspect-the-inventory-transaction-ledger-small">Inspect the inventory transaction ledger</small>
            </span>
            <ArrowRight data-testid="settings-page-arrow-right-3" size={18} />
          </Link>
          <div data-testid="settings-page-setting-note-div" className="setting-note">
            <ShieldCheck data-testid="settings-page-shield-check" size={20} />
            <p data-testid="settings-page-children-s-personal-information-is-not-collected-school-programs-use-aggreg-p">
              Children's personal information is not collected. School programs
              use aggregate student and pack counts.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function OrderPaymentConfirmation({ order, onSaved }: { order: Row; onSaved: () => void }) {
  const [reference, setReference] = useState(order.checkout?.paymentReference || '');
  const [method, setMethod] = useState('UPI');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const attempt = useRef({ requestKey: crypto.randomUUID(), paidAt: new Date().toISOString() });
  const balance = Math.max(0, order.totalPaise - order.paidPaise);
  if (!balance) return <p data-testid={"order-payment-confirmation-success-p" + "-" + String(order.id)} className="success">Payment confirmed · Paid in full</p>;
  if (order.status === 'CANCELLED') return null;
  if (order.status === 'DRAFT') return <p data-testid={"order-payment-confirmation-confirm-the-order-using-the-order-status-action-below-before-confirming-pay-p" + "-" + String(order.id)}>Confirm the order using the order status action below before confirming payment.</p>;
  return <section data-testid={"order-payment-confirmation-payment-confirmation-section" + "-" + String(order.id)} className="payment-confirmation"><h3 data-testid={"order-payment-confirmation-confirm-payment-received-h3" + "-" + String(order.id)}>Confirm payment received</h3>
    <p data-testid={"order-payment-confirmation-outstanding-record-this-only-after-checking-that-the-money-was-received-p" + "-" + String(order.id)}>Outstanding: <strong data-testid={"order-payment-confirmation-strong" + "-" + String(order.id)}>{money(balance)}</strong>. Record this only after checking that the money was received.</p>
    {order.checkout?.paymentReference && <p data-testid={"order-payment-confirmation-customer-reference-p" + "-" + String(order.id)}>Customer reference: <strong data-testid={"order-payment-confirmation-strong-2" + "-" + String(order.id)}>{order.checkout.paymentReference}</strong></p>}
    <div data-testid={"order-payment-confirmation-form-grid-div" + "-" + String(order.id)} className="form-grid"><label data-testid={"order-payment-confirmation-payment-method-label" + "-" + String(order.id)}>Payment method<select data-testid={"order-payment-confirmation-method-select" + "-" + String(order.id)} value={method} disabled={busy} onChange={e => setMethod(e.target.value)}>{['UPI','CASH','BANK_TRANSFER','CARD','OTHER'].map(m => <option data-testid={"order-payment-confirmation-option" + "-" + String(order.id) + "-" + String(m)} key={m}>{m}</option>)}</select></label>
    <label data-testid={"order-payment-confirmation-payment-reference-label" + "-" + String(order.id)}>Payment reference<input data-testid={"order-payment-confirmation-reference-input" + "-" + String(order.id)} value={reference} maxLength={200} disabled={busy} onChange={e => setReference(e.target.value)}/></label></div>
    <label data-testid={"order-payment-confirmation-i-have-verified-receipt-of-label" + "-" + String(order.id)}><input data-testid={"order-payment-confirmation-verified-input" + "-" + String(order.id)} type="checkbox" checked={verified} disabled={busy} onChange={e => setVerified(e.target.checked)}/> I have verified receipt of {money(balance)}.</label>
    {error && <p data-testid={"order-payment-confirmation-error-p" + "-" + String(order.id)} className="error" role="alert">{error}</p>}
    <div data-testid={"order-payment-confirmation-action-row-div" + "-" + String(order.id)} className="action-row"><button data-testid={"order-payment-confirmation-button-button" + "-" + String(order.id)} className="button primary" disabled={busy || !verified} onClick={async () => {
      setBusy(true); setError('');
      try { await api('payments', { method:'POST', body:JSON.stringify({ orderId:order.id, amountPaise:balance, kind:'PAYMENT', method, reference, ...attempt.current }) }); onSaved(); }
      catch(e: any) { setError(e.message); } finally { setBusy(false); }
    }}>{busy ? 'Confirming payment…' : 'Confirm payment received'}</button><Link data-testid={"order-payment-confirmation-payments-link" + "-" + String(order.id)} className="text-link" to="/payments">Record a partial payment</Link></div>
  </section>;
}

function RootApplication() { const location = useLocation(); return location.pathname.startsWith("/shop") ? <Shop /> : <App />; }
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <RootApplication />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
