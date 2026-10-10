import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { Alert, Button, CountPill, EmptyState, Field, SearchInput, Tag } from "../components/ui/primitives";
import { useGlobal, useToast } from "../state/context";
import { ROLE_LABELS } from "../permissions";
import { formatDate, matchesSearch, plural } from "../utils/format";

const EMPTY_FORM = { id: null, name: "", email: "", password: "", role: "USER" };
const ROLE_TONES = { ADMIN: "accent", USER: "blue", GUEST: "grey" };

function validate(form, users) {
  if (!form.name.trim()) return "Name is required.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
  if (!form.id && !form.password.trim()) return "Password is required for new users.";
  const email = form.email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === email && u.id !== form.id)) return "That email is already in use.";
  return null;
}

export default function Users() {
  const { request, user: currentUser } = useGlobal();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const refresh = useCallback(async () => {
    try {
      const data = await request("/api/users");
      setUsers(data.users || []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => users.filter((u) => matchesSearch(query.trim(), u.name, u.email, u.role)),
    [users, query],
  );

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const resetForm = () => { setForm(EMPTY_FORM); setFormError(null); };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate(form, users);
    if (problem) return setFormError(problem);

    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role };
    if (form.password.trim()) payload.password = form.password;

    setSaving(true);
    try {
      if (form.id) {
        const { user } = await request(`/api/users/${form.id}`, { method: "PATCH", body: payload });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
        toast.success(`Updated ${user.email}`);
      } else {
        const { user } = await request("/api/users", { method: "POST", body: payload });
        setUsers((prev) => [user, ...prev]);
        toast.success(`Created ${user.email}`);
      }
      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u) => {
    setForm({ id: u.id, name: u.name || "", email: u.email, password: "", role: u.role });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? They will no longer be able to sign in.`)) return;
    try {
      await request(`/api/users/${u.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(`Deleted ${u.email}`);
    } catch (err) {
      toast.error(`Couldn't delete user: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        subtitle="Manage who can sign in and what they can do"
        actions={
          <>
            <CountPill>{plural(users.length, "user")}</CountPill>
            <Button variant="dark" icon="refresh" onClick={refresh}>Refresh</Button>
          </>
        }
      />

      {loadError && <Alert>Couldn't load users: {loadError}</Alert>}

      <div className="stack">
        <Panel title={form.id ? "Edit user" : "Create user"} meta={form.id ? form.email : null}>
          <form onSubmit={submit} noValidate>
            {formError && <Alert>{formError}</Alert>}
            <div className="form-grid">
              <Field label="Full name">
                <input className="input" value={form.name} onChange={set("name")} placeholder="Jane Doe" autoComplete="off" />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" autoComplete="off" />
              </Field>
              <Field label="Role">
                <select className="select" value={form.role} onChange={set("role")}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label={form.id ? "New password (optional)" : "Password"}>
                <input className="input" type="password" value={form.password} onChange={set("password")}
                  placeholder={form.id ? "Leave blank to keep current" : "Set a password"} autoComplete="new-password" />
              </Field>
            </div>
            <div className="page-actions" style={{ marginTop: 16 }}>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : form.id ? "Save changes" : "Create user"}</Button>
              {form.id && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </Panel>

        <Panel flush footer={`Showing ${filtered.length} of ${plural(users.length, "user")}`}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--border-soft)" }}>
            <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or role…" />
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Created</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-strong">{u.name || "—"}{u.id === currentUser?.id && <span className="faint"> (you)</span>}</td>
                    <td>{u.email}</td>
                    <td><Tag tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role] ?? u.role}</Tag></td>
                    <td className="nowrap">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="page-actions" style={{ justifyContent: "flex-end" }}>
                        <Button size="sm" variant="outline" onClick={() => startEdit(u)}>Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => remove(u)} disabled={u.id === currentUser?.id}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <EmptyState>Loading users…</EmptyState>}
          {!loading && filtered.length === 0 && <EmptyState>No users found.</EmptyState>}
        </Panel>
      </div>
    </>
  );
}
