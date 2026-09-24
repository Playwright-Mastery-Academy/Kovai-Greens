import { useEffect, useRef, useState } from "react";
import { Sprout, X } from "lucide-react";
import { api, setToken, type Row } from "./api";

export default function CustomerAccount() {
  const [user, setUser] = useState<Row | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let mounted = true;
    api("me").then(u => { if (mounted) setUser(u); }).catch(() => {}).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  async function logout() {
    setBusy(true); setError("");
    try { await api("auth/logout", { method: "POST" }); setToken(""); setUser(null); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    {ready && user?.role !== "GUEST" && <a data-testid="shop-farm-admin-a" href="/">Farm admin</a>}
    {ready && (user ? <><span data-testid="shop-account-name">{user.name}</span><button data-testid="shop-account-sign-out" className="shop-secondary" disabled={busy} onClick={logout}>Sign out</button></> : <button data-testid="shop-account-sign-in" className="shop-secondary" onClick={() => { setError(""); setRegister(false); setOpen(true); }}>Customer sign in</button>)}
    {error && !open && <span data-testid="shop-account-error" role="alert">{error}</span>}
    {open && <dialog data-testid="shop-account-dialog" ref={dialog} className={"customer-account-dialog" + (register ? " is-register" : "")} aria-labelledby="customer-login-heading" onCancel={e => { if (busy) e.preventDefault(); else setOpen(false); }}>
      <button type="button" data-testid="shop-account-cancel" className="customer-account-close" aria-label="Close sign in" disabled={busy} onClick={() => setOpen(false)}><X size={20} /></button>
      <div className="customer-account-brand"><Sprout size={28} aria-hidden="true" /></div>
      <p className="customer-account-eyebrow">KOVAI GREENS</p>
      <h2 data-testid="shop-account-heading" id="customer-login-heading">{register ? "A fresh start awaits" : "Welcome back"}</h2>
      <p className="customer-account-intro">{register ? "Create your customer account and discover farm-fresh greens." : "Sign in to your customer account."}</p>
      <form data-testid="shop-account-form" key={String(register)} onSubmit={async e => {
        e.preventDefault(); setError("");
        const form = e.currentTarget; const values = new FormData(form);
        if (register && values.get("password") !== values.get("confirmPassword")) { setError("Passwords do not match."); return; }
        setBusy(true);
        try {
          const result = await api(register ? "auth/register" : "auth/login", { method: "POST", body: JSON.stringify({ username: values.get("username"), password: values.get("password"), ...(register ? { name: values.get("name") } : {}) }) });
          setToken(result.accessToken); setUser(result.user); form.reset(); setOpen(false);
        } catch (e: any) { setError(e.message); } finally { setBusy(false); }
      }}>
        {register && <label>Full name<input data-testid="shop-account-full-name" name="name" autoComplete="name" required maxLength={100} disabled={busy} /></label>}
        <label data-testid="shop-account-username-label">Username<input data-testid="shop-account-username" name="username" autoComplete="username" required maxLength={100} autoFocus disabled={busy} /></label>
        <label data-testid="shop-account-password-label">Password<input data-testid="shop-account-password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 10 : 1} maxLength={128} disabled={busy} />{register && <small>Use at least 10 characters.</small>}</label>
        {register && <label>Confirm password<input data-testid="shop-account-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required maxLength={128} disabled={busy} /></label>}
        {error && <p className="customer-account-error" data-testid="shop-account-login-error" role="alert">{error}</p>}
        <button data-testid="shop-account-submit" className="shop-primary" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      <p className="customer-account-switch">{register ? "Already have an account?" : "New to Kovai Greens?"} <button type="button" data-testid="shop-account-switch" disabled={busy} onClick={() => { setRegister(!register); setError(""); }}>{register ? "Sign in" : "Create account"}</button></p>
    </dialog>}
  </>;
}
