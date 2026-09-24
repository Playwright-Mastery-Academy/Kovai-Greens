import { useEffect, useRef, useState } from "react";
import { api, setToken, type Row } from "./api";

/** Customer sessions never expose staff actions to the Guest role. */
export default function CustomerAccount() {
  const [user, setUser] = useState<Row | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let mounted = true;
    api("me").then(u => { if (mounted) setUser(u); })
      .catch(() => {})
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  async function logout() {
    setBusy(true); setError("");
    try {
      await api("auth/logout", { method: "POST" });
      setToken(""); setUser(null);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <>
    {ready && user?.role !== "GUEST" && <a data-testid="shop-farm-admin-a" href="/">Farm admin</a>}
    {ready && (user ? <>
      <span data-testid="shop-account-name">{user.name}</span>
      <button data-testid="shop-account-sign-out" className="shop-secondary" disabled={busy} onClick={logout}>Sign out</button>
    </> : <button data-testid="shop-account-sign-in" className="shop-secondary" onClick={() => { setError(""); setOpen(true); }}>Customer sign in</button>)}
    {error && !open && <span data-testid="shop-account-error" role="alert">{error}</span>}
    {open && <dialog data-testid="shop-account-dialog" ref={dialog} className="modal" aria-labelledby="customer-login-heading" onCancel={() => setOpen(false)}>
      <h2 data-testid="shop-account-heading" id="customer-login-heading">Customer sign in</h2>
      <form data-testid="shop-account-form" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError("");
        const form = e.currentTarget;
        const values = new FormData(form);
        try {
          const result = await api("auth/login", { method: "POST", body: JSON.stringify({ username: values.get("username"), password: values.get("password") }) });
          setToken(result.accessToken); setUser(result.user); form.reset(); setOpen(false);
        } catch (e: any) { setError(e.message); }
        finally { setBusy(false); }
      }}>
        <label data-testid="shop-account-username-label">Username
          <input data-testid="shop-account-username" name="username" autoComplete="username" required autoFocus disabled={busy} />
        </label>
        <label data-testid="shop-account-password-label">Password
          <input data-testid="shop-account-password" name="password" type="password" autoComplete="current-password" required disabled={busy} />
        </label>
        {error && <p data-testid="shop-account-login-error" role="alert">{error}</p>}
        <div data-testid="shop-account-actions" className="action-row">
          <button data-testid="shop-account-submit" className="shop-primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
          <button data-testid="shop-account-cancel" className="shop-secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </form>
    </dialog>}
  </>;
}
