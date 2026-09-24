import { useState } from "react";
import { api, type Row } from "./api";
export default function UserEditor({ record, owner, onSaved }: { record: Row; owner: boolean; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function remove() {
    setBusy(true); setError("");
    try { await api(`users/${record.id}`, { method: "DELETE" }); onSaved(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <form className="user-editor" data-testid="user-editor" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    const values = new FormData(e.currentTarget);
    try {
      await api(`users/${record.id}`, { method: "PATCH", body: JSON.stringify({ name: values.get("name"), username: values.get("username"), role: values.get("role"), active: values.get("active") === "on" }) });
      onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }}>
    <h3 data-testid="user-editor-heading">Account details</h3>
    <label>Full name<input data-testid="user-edit-name" name="name" defaultValue={record.name} required maxLength={100} disabled={busy} /></label>
    <label>Username<input data-testid="user-edit-username" name="username" defaultValue={record.username} required maxLength={100} pattern="[a-zA-Z0-9_.@\-]+" disabled={busy} /></label>
    <label>Access role<select data-testid="user-edit-role" name="role" defaultValue={record.role} disabled={busy}>{[...(owner ? ["OWNER"] : []), "ADMIN", "GUEST", "PRODUCTION_MANAGER", "FARM_WORKER", "SALES", "DELIVERY"].map(role => <option key={role} value={role}>{role === "GUEST" ? "Customer / Guest" : role.toLowerCase().replaceAll("_", " ")}</option>)}</select></label>
    <label className="user-active"><input data-testid="user-edit-active" type="checkbox" name="active" defaultChecked={record.active} disabled={busy} /> Account active</label>
    <p className="muted">Saving changes signs this user out. They can sign in again if their account is active.</p>
    {error && <p data-testid="user-edit-error" className="error" role="alert">{error}</p>}
    <div className="action-row">
      <button data-testid="user-edit-save" className="button primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      {record.role !== "OWNER" && <button data-testid="user-delete" className="button danger" type="button" disabled={busy} onClick={() => setConfirm(true)}>Delete user</button>}
    </div>
    {confirm && <div className="confirmation" role="alert" data-testid="user-delete-confirmation"><strong>Delete {record.name}?</strong><p>This permanently removes their login account. Existing business records remain.</p><div className="action-row"><button type="button" className="button" data-testid="user-delete-cancel" disabled={busy} onClick={() => setConfirm(false)}>Keep user</button><button type="button" className="button danger" data-testid="user-delete-confirm" disabled={busy} onClick={remove}>Yes, delete user</button></div></div>}
  </form>;
}
