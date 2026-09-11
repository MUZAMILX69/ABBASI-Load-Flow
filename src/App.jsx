import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabase = createClient(
  'https://rhqfzporlfkemifravsl.supabase.co',
  'sb_publishable_99sw5exqmMxdgiEb18zoIA_ufRNscGW'
);

/* ============ helpers ============ */
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const thisMonthKey = () => today().slice(0, 7);
const fmt = n => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-PK');
const short = n => n >= 1000 ? ('Rs ' + (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k') : ('Rs ' + n);
const fmtDate = iso => {
  try { return new Date(iso + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso || '—'; }
};
const monthLabel = m => new Date(m + '-01T00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const edNo = n => 'ED-' + String(n).padStart(3, '0');
const uid = () => Date.now() + Math.floor(Math.random() * 999);

/* ============ sortable table hook ============ */
function useSort(defaultKey = '', defaultDir = '') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);
  const toggle = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else if (sortDir === 'desc') { setSortKey(''); setSortDir(''); }
    else setSortDir('asc');
  };
  const apply = (list, getters) => {
    if (!sortKey || !sortDir) return list;
    const get = getters[sortKey] || (x => x[sortKey]);
    const cmp = (a, b) => {
      const va = get(a), vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), undefined, { numeric: true });
    };
    return [...list].sort((a, b) => sortDir === 'asc' ? cmp(a, b) : cmp(b, a));
  };
  const Th = ({ k, children, align }) => (
    <th style={{ textAlign: align || 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => toggle(k)}>
      {children}
      <span style={{ marginLeft: 5, opacity: sortKey === k ? 1 : 0.3, fontSize: 11 }}>
        {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  );
  return { sortKey, sortDir, toggle, apply, Th };
}

/* ============ icons ============ */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = {
  dash: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>,
  cash: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5h.01M18 14.5h.01"/></svg>,
  report: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M6 2.5h9l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>,
  users: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15.2c2.3.3 3.9 1.9 4.4 4.8"/></svg>,
  truck: <svg width="26" height="26" viewBox="0 0 32 32"><path d="M4 21h14v-10H4z" fill="#0B312B"/><path d="M18 14h6l4 4v3h-10z" fill="#0B312B"/><circle cx="10" cy="23" r="2.6" fill="#0B312B"/><circle cx="23" cy="23" r="2.6" fill="#0B312B"/></svg>,
  box: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M12 2.7L21 7v10l-9 4.3L3 17V7z"/><path d="M3 7l9 4.3L21 7M12 11.3V21.3"/></svg>,
  ledger: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M12 8h5M12 12h5M12 16h3"/></svg>,
  pin: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>,
  bike: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M5.5 17l4-7h5l4 7M9.5 10L8 6h3"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M12 5v14M5 12h14"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>,
  print: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></svg>,
  dl: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" {...S}><path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13"/></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 24 24" {...S}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l3 3"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  lock: <svg width="20" height="20" viewBox="0 0 24 24" {...S}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  menu: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  wallet: <svg width="19" height="19" viewBox="0 0 24 24" {...S}><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/></svg>,
};

/* ============ data fetch ============ */
async function fetchAll() {
  const [peopleRes, advancesRes, freightsRes, visitsRes, expRes, catRes] = await Promise.all([
    supabase.from('people').select('*').order('id'),
    supabase.from('advances').select('*').order('id'),
    supabase.from('freights').select('*').order('id'),
    supabase.from('visits').select('*, visit_entries(*)').order('id'),
    supabase.from('expenses').select('*').order('id'),
    supabase.from('expense_categories').select('*').order('name'),
  ]);
  return {
    people: peopleRes.data || [],
    advances: advancesRes.data || [],
    freights: freightsRes.data || [],
    visits: visitsRes.data || [],
    expenses: expRes.data || [],
    categories: catRes.data || []
  };
}

/* ============ LOGIN ============ */
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profile && !profile.active) {
        await supabase.auth.signOut();
        setError('Your account has been disabled. Contact admin.');
        setLoading(false);
        return;
      }
      onLogin({ ...profile, authId: data.user.id, email: data.user.email });
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">{I.truck}</div>
          <div><div className="brand-name">ABBASI</div><div className="brand-sub">Load Flow</div></div>
        </div>
        <form onSubmit={submit}>
          <div className="login-icon">{I.lock}</div>
          <h2 className="disp">Sign in to your account</h2>
          {error && <div className="err">{error}</div>}
          <div className="field"><label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="muzamil@abbasi.com" /></div>
          <div className="field"><label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button className="btn primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============ permissions ============ */
function canView(user, view) {
  if (user.is_admin) return true;
  const map = {
    dashboard: 'can_view_dashboard', entry: 'can_view_advance', report: 'can_view_advance',
    empMonthly: 'can_view_advance', freight: 'can_view_freight', ledger: 'can_view_ledger',
    visit: 'can_view_visit', visitReports: 'can_view_visit', people: 'can_view_people',
    userManagement: 'is_admin', expense: 'can_view_expense'
  };
  return user[map[view]] !== false;
}
function canEdit(user, type) {
  if (user.is_admin) return true;
  const map = { advance: 'can_edit_advance', freight: 'can_edit_freight', visit: 'can_edit_visit', people: 'can_edit_people', expense: 'can_edit_expense' };
  return user[map[type]] !== false;
}
function canDelete(user, type) {
  if (user.is_admin) return true;
  const map = { advance: 'can_delete_advance', freight: 'can_delete_freight', visit: 'can_delete_visit', people: 'can_delete_people', expense: 'can_delete_expense' };
  return user[map[type]] !== false;
}

/* ============ tiny pieces ============ */
function useCountUp(target, dur = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s = null, raf;
    const step = t => {
      if (!s) s = t;
      const p = Math.min(1, (t - s) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}
function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);
  return (
    <span className="clock-chip">{I.clock}
      <b>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</b>
      · {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
    </span>
  );
}
function StatCard({ label, value, money, suffix, sub, icon, tint }) {
  const v = useCountUp(value);
  return (
    <div className="card stat">
      <div className="s-lbl">{label}</div>
      <div className="s-val">{money ? fmt(v) : v.toLocaleString('en-PK')}{suffix ? <span className="s-suffix">{suffix}</span> : null}</div>
      <div className="s-sub">{sub}</div>
      <div className="s-ico" style={{ background: tint + '22', color: tint }}>{icon}</div>
    </div>
  );
}
function PrintHead({ title, meta }) {
  return <div className="print-only"><h1>ABBASI Load Flow — {title}</h1><p>{meta} · Generated {new Date().toLocaleString('en-GB')}</p></div>;
}
function Modal({ title, onClose, children, wide }) {
  return createPortal(
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal-card' + (wide ? ' wide' : '')}>
        <div className="modal-h"><h3 className="disp">{title}</h3><button className="icon-btn" onClick={onClose}>{I.x}</button></div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ============ USER MANAGEMENT ============ */
function UserManagement({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', username: '' });
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('username');
    setProfiles(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchProfiles(); }, []);
  const createUser = async e => {
    e.preventDefault();
    setErr('');
    if (!newUser.email || !newUser.password) { setErr('Email and password required.'); return; }
    try {
      const { error } = await supabase.auth.signUp({
        email: newUser.email, password: newUser.password,
        options: { data: { username: newUser.username || newUser.email.split('@')[0], full_name: newUser.full_name } }
      });
      if (error) throw error;
      setNewUser({ email: '', password: '', full_name: '', username: '' });
      setShowForm(false);
      setTimeout(fetchProfiles, 1500);
    } catch (e2) { setErr(e2.message); }
  };
  const updateProfile = async (id, updates) => {
    await supabase.from('profiles').update(updates).eq('id', id);
    fetchProfiles();
  };
  if (!user.is_admin) return <div className="empty"><div className="big">🔒</div>Admin access required.</div>;
  const filtered = profiles.filter(u => !q || (u.username + ' ' + (u.full_name || '')).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card rise">
      <div className="card-h"><h3>User Management</h3>
        <button className="btn primary small" onClick={() => { setEditing(null); setShowForm(true); }}>{I.plus} Create User</button></div>
      <div className="filters no-print">
        <div className="search-box">{I.search}<input placeholder="Search users…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {loading ? <div className="empty">Loading…</div> : filtered.length === 0 ? <div className="empty">No users found.</div> : (
        <div className="user-cards-grid">
          {filtered.map(u => (
            <div className="user-card-item" key={u.id}>
              <div className="user-card-top">
                <div className="user-card-avatar">{(u.username || 'U')[0].toUpperCase()}</div>
                <div className="user-card-info">
                  <div className="user-card-name">{u.full_name || u.username}</div>
                  <div className="user-card-username">@{u.username}</div>
                </div>
                <span className={u.is_admin ? 'badge b-Employee' : 'badge b-Customer'} style={{ marginLeft: 'auto' }}>{u.is_admin ? 'Admin' : 'User'}</span>
              </div>
              <div className="user-card-perms">
                {u.is_admin ? <span className="perm-tag full">Full Access</span> : (
                  <>
                    {u.can_view_advance && <span className="perm-tag">Advance</span>}
                    {u.can_view_freight && <span className="perm-tag">Freight</span>}
                    {u.can_view_ledger && <span className="perm-tag">Ledger</span>}
                    {u.can_view_visit && <span className="perm-tag">Visits</span>}
                    {u.can_view_people && <span className="perm-tag">People</span>}
                    {u.can_view_reports && <span className="perm-tag">Reports</span>}
                    {u.can_view_dashboard && <span className="perm-tag">Dashboard</span>}
                    {u.can_view_expense && <span className="perm-tag">Expenses</span>}
                  </>
                )}
              </div>
              <div className="user-card-foot">
                <span className={u.active ? 'badge b-Employee' : 'badge b-Relation'}>{u.active ? '● Active' : '● Disabled'}</span>
                <button className="btn primary small" onClick={() => { setEditing(u); setShowForm(true); }}>{I.edit} Edit User</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && !editing && createPortal(
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-card">
            <div className="modal-h"><h3 className="disp">Create New User</h3><button className="icon-btn" onClick={() => setShowForm(false)}>{I.x}</button></div>
            <form onSubmit={createUser}>
              {err && <div className="err">{err}</div>}
              <div className="field"><label>Email (login)</label><input type="email" value={newUser.email} onChange={e => setNewUser(x => ({ ...x, email: e.target.value }))} required /></div>
              <div className="field"><label>Password</label><input type="password" value={newUser.password} onChange={e => setNewUser(x => ({ ...x, password: e.target.value }))} required minLength={6} /></div>
              <div className="form-grid">
                <div className="field"><label>Username</label><input value={newUser.username} onChange={e => setNewUser(x => ({ ...x, username: e.target.value }))} /></div>
                <div className="field"><label>Full Name</label><input value={newUser.full_name} onChange={e => setNewUser(x => ({ ...x, full_name: e.target.value }))} /></div>
              </div>
              <button className="btn primary" type="submit">Create User</button>
            </form>
          </div>
        </div>, document.body
      )}
      {showForm && editing && (
        <EditProfileModal profile={editing} onSave={updateProfile} onClose={() => { setEditing(null); setShowForm(false); fetchProfiles(); }} />
      )}
    </div>
  );
}

function EditProfileModal({ profile, onSave, onClose }) {
  const [f, setF] = useState({ ...profile });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault();
    const { id, created_at, ...updates } = f;
    await onSave(id, updates);
    onClose();
  };
  return createPortal(
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card wide">
        <div className="modal-h"><h3 className="disp">Edit — {profile.username}</h3><button className="icon-btn" onClick={onClose}>{I.x}</button></div>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Username</label><input value={f.username || ''} onChange={e => set('username', e.target.value)} /></div>
            <div className="field"><label>Full Name</label><input value={f.full_name || ''} onChange={e => set('full_name', e.target.value)} /></div>
          </div>
          <div className="field"><label><input type="checkbox" checked={f.is_admin} onChange={e => set('is_admin', e.target.checked)} style={{ marginRight: 8 }} /> Administrator</label></div>
          <div className="field"><label><input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} style={{ marginRight: 8 }} /> Active (can login)</label></div>
          {!f.is_admin && (
            <div style={{ marginTop: 18 }}>
              <label className="field-label-sec">Permissions</label>
              <div className="perm-grid">
                <div><h4>Advance</h4>
                  <label><input type="checkbox" checked={f.can_view_advance} onChange={e => set('can_view_advance', e.target.checked)} /> View</label>
                  <label><input type="checkbox" checked={f.can_edit_advance} onChange={e => set('can_edit_advance', e.target.checked)} /> Edit</label>
                  <label><input type="checkbox" checked={f.can_delete_advance} onChange={e => set('can_delete_advance', e.target.checked)} /> Delete</label></div>
                <div><h4>Freight</h4>
                  <label><input type="checkbox" checked={f.can_view_freight} onChange={e => set('can_view_freight', e.target.checked)} /> View</label>
                  <label><input type="checkbox" checked={f.can_edit_freight} onChange={e => set('can_edit_freight', e.target.checked)} /> Edit</label>
                  <label><input type="checkbox" checked={f.can_delete_freight} onChange={e => set('can_delete_freight', e.target.checked)} /> Delete</label></div>
                <div><h4>Ledger</h4>
                  <label><input type="checkbox" checked={f.can_view_ledger} onChange={e => set('can_view_ledger', e.target.checked)} /> View</label></div>
                <div><h4>Visits</h4>
                  <label><input type="checkbox" checked={f.can_view_visit} onChange={e => set('can_view_visit', e.target.checked)} /> View</label>
                  <label><input type="checkbox" checked={f.can_edit_visit} onChange={e => set('can_edit_visit', e.target.checked)} /> Edit</label>
                  <label><input type="checkbox" checked={f.can_delete_visit} onChange={e => set('can_delete_visit', e.target.checked)} /> Delete</label></div>
                <div><h4>People</h4>
                  <label><input type="checkbox" checked={f.can_view_people} onChange={e => set('can_view_people', e.target.checked)} /> View</label>
                  <label><input type="checkbox" checked={f.can_edit_people} onChange={e => set('can_edit_people', e.target.checked)} /> Edit</label>
                  <label><input type="checkbox" checked={f.can_delete_people} onChange={e => set('can_delete_people', e.target.checked)} /> Delete</label></div>
                <div><h4>Expenses</h4>
                  <label><input type="checkbox" checked={f.can_view_expense} onChange={e => set('can_view_expense', e.target.checked)} /> View</label>
                  <label><input type="checkbox" checked={f.can_edit_expense} onChange={e => set('can_edit_expense', e.target.checked)} /> Edit</label>
                  <label><input type="checkbox" checked={f.can_delete_expense} onChange={e => set('can_delete_expense', e.target.checked)} /> Delete</label></div>
                <div><h4>Reports</h4>
                  <label><input type="checkbox" checked={f.can_view_reports} onChange={e => set('can_view_reports', e.target.checked)} /> View</label></div>
                <div><h4>Dashboard</h4>
                  <label><input type="checkbox" checked={f.can_view_dashboard} onChange={e => set('can_view_dashboard', e.target.checked)} /> View</label></div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn primary" type="submit">Save Changes</button>
            <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

/* ============ SIDEBAR & TOPBAR ============ */
function Sidebar({ view, setView, people, advances, freights, user, onLogout, open, onClose }) {
  const secs = [
    { label: 'Overview', items: [{ k: 'dashboard', label: 'Dashboard', ico: I.dash }] },
    { label: 'Salary Advance', items: [
      { k: 'entry', label: 'Advance Entry', ico: I.cash },
      { k: 'report', label: 'Advance Report', ico: I.report, n: advances.length },
      { k: 'empMonthly', label: 'Employee Monthly', ico: I.report }] },
    { label: 'Loader Operations', items: [
      { k: 'freight', label: 'Freight Entry', ico: I.box, n: freights.length },
      { k: 'ledger', label: 'Loader Ledger', ico: I.ledger }] },
    { label: 'Accounts', items: [{ k: 'expense', label: 'Expense Detail', ico: I.wallet }] },
    { label: 'Field Visits', items: [
      { k: 'visit', label: 'Daily Visit Entry', ico: I.pin },
      { k: 'visitReports', label: 'Visit Reports', ico: I.bike }] },
    { label: 'Directory', items: [{ k: 'people', label: 'People Register', ico: I.users, n: people.length }] },
  ];
  if (user.is_admin) secs.push({ label: 'Admin', items: [{ k: 'userManagement', label: 'User Management', ico: I.users }] });
  const filteredSecs = secs.map(s => ({ ...s, items: s.items.filter(it => canView(user, it.k)) })).filter(s => s.items.length > 0);
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <button className="icon-btn side-close" onClick={onClose}>{I.x}</button>
        <div className="brand">
          <div className="brand-mark">{I.truck}</div>
          <div><div className="brand-name">ABBASI</div><div className="brand-sub">Load Flow</div></div>
        </div>
        <div className="user-chip">
          <div className="user-avatar">{(user.username || 'U')[0].toUpperCase()}</div>
          <div><div className="user-name">{user.full_name || user.username}</div><div className="user-role">{user.is_admin ? 'Administrator' : 'User'}</div></div>
        </div>
        <nav className="nav">
          {filteredSecs.map(sec => (
            <div key={sec.label}>
              <div className="nav-sec">{sec.label}</div>
              {sec.items.map(it => (
                <button key={it.k} className={'nav-item' + (view === it.k ? ' active' : '')} onClick={() => { setView(it.k); onClose(); }}>
                  {it.ico}{it.label}{it.n !== undefined && <span className="nav-count">{it.n}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <span>v1.7 · Sorting</span>
          <button className="btn ghost small" onClick={onLogout} style={{ padding: '6px 12px' }}>{I.logout} Sign out</button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ view, setView, user, onMenu }) {
  const meta = {
    dashboard: ['Operations', 'Operations Dashboard', 'Advances, freight, visits & people — one control deck'],
    entry: ['Voucher Desk', 'Salary Advance Entry', 'Every entry is auto-alloted the next ED serial'],
    report: ['Ledger', 'Advance Report', 'Search, filter, sort, edit, print & export'],
    empMonthly: ['Statement', 'Employee Monthly Statement', 'Pick an employee and month — every ED entry listed'],
    freight: ['Loader Operations', 'Freight Entry', 'Gatepass freight booked against each loader'],
    ledger: ['Loader Operations', 'Loader Ledger', 'Freight credits minus advance debits — live balance'],
    expense: ['Accounts', 'Expense Detail', 'Daily expenses, types and filtered reports'],
    visit: ['Field Visits', 'Daily Visit Entry', 'Bike run (KM) with each customer stop logged underneath'],
    visitReports: ['Field Visits', 'Visit & Bike Run Reports', 'Daily contact report and month-wise KM register'],
    people: ['Directory', 'People Register', 'Employees · Loaders · Customers · Relations'],
    userManagement: ['Admin', 'User Management', 'Create users and manage permissions'],
  };
  const [crumb, title, sub] = meta[view] || ['Operations', 'Dashboard', ''];
  return (
    <div className="topbar">
      <div><div className="crumb">{crumb}</div><h1 className="disp">{title}</h1><div className="sub">{sub}</div></div>
      <div className="top-actions">
        <button className="btn ghost menu-btn" onClick={onMenu} title="Menu">{I.menu}</button>
        <Clock />
        {view !== 'entry' && canView(user, 'entry') && <button className="btn amber" onClick={() => setView('entry')}>{I.plus} New Advance</button>}
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
function MonthChart({ advances }) {
  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    series.push({ key, label: d.toLocaleString('en', { month: 'short' }),
      total: advances.filter(a => a.entry_date && a.entry_date.slice(0, 7) === key).reduce((s, a) => s + Number(a.amount || 0), 0) });
  }
  const max = Math.max(...series.map(s => s.total), 1);
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 90); return () => clearTimeout(t); }, []);
  return (
    <div className="chart">
      {series.map((s, i) => (
        <div key={s.key} className="col" title={s.label + ': ' + fmt(s.total)}>
          <div className="amt">{s.total ? short(s.total) : ''}</div>
          <div className="bar" style={{ height: on ? (s.total / max * 100) + '%' : '0%', transitionDelay: i * 70 + 'ms' }} />
          <div className="mlab">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ people, advances, freights, visits, expenses, setView, user }) {
  const c = t => people.filter(p => p.type === t).length;
  const totalAmt = advances.reduce((s, a) => s + Number(a.amount || 0), 0);
  const freightTotal = freights.reduce((s, f) => s + Number(f.amount || 0), 0);
  const mk = thisMonthKey();
  const kmMonth = visits.filter(v => v.visit_date && v.visit_date.slice(0, 7) === mk).reduce((s, v) => s + Number(v.bike_km || 0), 0);
  const stopsMonth = visits.filter(v => v.visit_date && v.visit_date.slice(0, 7) === mk).reduce((s, v) => s + (v.visit_entries ? v.visit_entries.length : 0), 0);
  const expMonth = expenses.filter(x => x.entry_date && x.entry_date.slice(0, 7) === mk).reduce((s, x) => s + Number(x.amount || 0), 0);
  const recent = [...advances].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5);
  return (
    <>
      <div className="route-strip rise">
        <h2>Load Flow is moving.</h2>
        <p>{advances.length} advance vouchers · {freights.length} freight gatepasses · {visits.length} field runs · {expenses.length} expenses logged.</p>
        <svg viewBox="0 0 600 70" preserveAspectRatio="none">
          <path className="route-dash" d="M0,50 C90,16 190,62 300,32 S 480,44 600,18" />
          <circle r="5" fill="#F0A429"><animateMotion dur="9s" repeatCount="indefinite" path="M0,50 C90,16 190,62 300,32 S 480,44 600,18" /></circle>
        </svg>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }} className="no-print">
          {canView(user, 'entry') && <button className="btn amber small" onClick={() => setView('entry')}>{I.plus} New Advance</button>}
          {canView(user, 'freight') && <button className="btn amber small" onClick={() => setView('freight')}>{I.box} Book Freight</button>}
          {canView(user, 'expense') && <button className="btn amber small" onClick={() => setView('expense')}>{I.wallet} Add Expense</button>}
          {canView(user, 'visit') && <button className="btn ghost small" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,.35)', color: '#fff' }} onClick={() => setView('visit')}>Log Visit Run</button>}
        </div>
      </div>
      <div className="stats">
        <StatCard label="People Registered" value={people.length} tint="#0E6E5C" icon={I.users}
          sub={<span>{c('Employee')} employees · {c('Loader')} loaders · {c('Customer')} customers</span>} />
        <StatCard label="Advance Disbursed" value={totalAmt} money tint="#C9820E" icon={I.cash}
          sub={<span>{advances.length} vouchers issued to date</span>} />
        <StatCard label="Freight Booked" value={freightTotal} money tint="#2F7FA3" icon={I.box}
          sub={<span>{freights.length} gatepass entries</span>} />
        <StatCard label="Expenses · This Month" value={expMonth} money tint="#D9534A" icon={I.wallet}
          sub={<span>{kmMonth} km bike run · {stopsMonth} stops</span>} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-h"><h3>Advance flow · last 6 months</h3><span className="tag">Rs disbursed</span></div>
          <MonthChart advances={advances} />
        </div>
        <div className="card">
          <div className="card-h"><h3>Recent vouchers</h3><span className="tag">latest {recent.length}</span></div>
          <div className="rlist">
            {recent.length === 0 && <div className="empty">No advances yet — issue your first voucher.</div>}
            {recent.map(a => {
              const person = people.find(p => p.id === a.person_id);
              return (
                <div className="rrow" key={a.ed_no}>
                  <span className="ed-pill">{a.ed_no}</span>
                  <div><div className="nm">{person ? person.name : 'Unknown'}</div><div className="dt">{fmtDate(a.entry_date)} · {a.mode}</div></div>
                  <div className="amt-r">{fmt(a.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
/* ============ ADVANCE ENTRY ============ */
function EntryForm({ people, onSave, user }) {
  const [date, setDate] = useState(today());
  const [pid, setPid] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');
  const [purpose, setPurpose] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [nextEdNo, setNextEdNo] = useState('ED-001');
  const staff = people.filter(p => p.type === 'Employee' || p.type === 'Loader');
  const others = people.filter(p => p.type === 'Customer' || p.type === 'Relation');
  useEffect(() => {
    async function fetchNextEd() {
      const { data } = await supabase.from('advances').select('ed_no').order('id', { ascending: false }).limit(1);
      if (data && data.length > 0) setNextEdNo(edNo(parseInt(String(data[0].ed_no).replace(/\D/g, ''), 10) + 1));
    }
    fetchNextEd();
  }, []);
  const doSubmit = async (andPrint, e) => {
    if (e) e.preventDefault();
    const person = people.find(p => String(p.id) === String(pid));
    if (!person) return setErr('Please select the employee / person receiving the advance.');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr('Enter a valid amount greater than zero.');
    setErr(''); setSaving(true);
    try {
      const { data: maxData } = await supabase.from('advances').select('ed_no').order('id', { ascending: false }).limit(1);
      let newEdNo = 'ED-001';
      if (maxData && maxData.length > 0) newEdNo = edNo(parseInt(String(maxData[0].ed_no).replace(/\D/g, ''), 10) + 1);
      const rec = { ed_no: newEdNo, entry_date: date, person_id: person.id, amount: amt, mode, purpose: purpose.trim() };
      const { data, error } = await supabase.from('advances').insert(rec).select().single();
      if (error) throw error;
      onSave(data, andPrint);
      setAmount(''); setPurpose('');
      setNextEdNo(edNo(parseInt(newEdNo.replace(/\D/g, ''), 10) + 1));
    } catch (e2) { setErr(e2.message || 'Failed to save'); } finally { setSaving(false); }
  };
  return (
    <div className="entry-wrap">
      <div className="ticket">
        <div className="t-top">Advance Voucher</div>
        <div className="t-ed">{nextEdNo}</div>
        <span className="t-status"><span className="pulse" /> AUTO-ALOTED</span>
        <div className="t-foot">Serial locks on save. Next: <b className="mono">{edNo(parseInt(nextEdNo.replace(/\D/g, ''), 10) + 1)}</b><br />Date: <b className="mono">{fmtDate(date)}</b></div>
      </div>
      <form className="card" style={{ padding: 24 }} onSubmit={e => doSubmit(false, e)}>
        <div className="card-h" style={{ padding: '0 0 16px', marginBottom: 16 }}><h3>Salary Advance Entry</h3><span className="tag">ED series</span></div>
        {err && <div className="err">{err}</div>}
        <div className="form-grid">
          <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          <div className="field"><label>Employee / Person</label>
            <select value={pid} onChange={e => setPid(e.target.value)}>
              <option value="">— select from register —</option>
              <optgroup label="Employees & Loaders">{staff.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role || p.type}</option>)}</optgroup>
              {others.length > 0 && <optgroup label="Customers & Relations">{others.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role || p.type}</option>)}</optgroup>}
            </select></div>
          <div className="field"><label>Amount (Rs)</label>
            <input type="number" min="1" placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} />
            <div className="chips">{[1000, 2500, 5000, 10000, 20000].map(v => <button type="button" key={v} className="chip" onClick={() => setAmount(String(v))}>+{v.toLocaleString()}</button>)}</div></div>
          <div className="field"><label>Payment Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)}><option>Cash</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option></select></div>
        </div>
        <div className="field"><label>Purpose (optional)</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Medical, school fees, Eid expenses…" /></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Advance'}</button>
          <button className="btn amber" type="button" onClick={() => doSubmit(true)} disabled={saving}>Save & Print {nextEdNo}</button>
        </div>
      </form>
    </div>
  );
}

function EditAdvanceForm({ rec, people, onSave, onClose }) {
  const [f, setF] = useState({ entry_date: rec.entry_date, person_id: rec.person_id, amount: rec.amount, mode: rec.mode, purpose: rec.purpose || '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault();
    const person = people.find(p => p.id === f.person_id);
    if (!person) return setErr('Select a person.');
    const amt = Number(f.amount);
    if (!amt || amt <= 0) return setErr('Enter a valid amount.');
    setSaving(true);
    try {
      const { error } = await supabase.from('advances').update({ ...f, amount: amt }).eq('id', rec.id);
      if (error) throw error;
      onSave({ ...rec, ...f, amount: amt }); onClose();
    } catch (e2) { setErr(e2.message || 'Failed to update'); setSaving(false); }
  };
  return (
    <form onSubmit={submit}>
      {err && <div className="err">{err}</div>}
      <div className="form-grid">
        <div className="field"><label>Date</label><input type="date" value={f.entry_date} onChange={e => set('entry_date', e.target.value)} /></div>
        <div className="field"><label>Employee / Person</label>
          <select value={f.person_id} onChange={e => set('person_id', Number(e.target.value))}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.type}</option>)}</select></div>
        <div className="field"><label>Amount (Rs)</label><input type="number" min="1" value={f.amount} onChange={e => set('amount', e.target.value)} /></div>
        <div className="field"><label>Payment Mode</label>
          <select value={f.mode} onChange={e => set('mode', e.target.value)}><option>Cash</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option></select></div>
      </div>
      <div className="field"><label>Purpose</label><input value={f.purpose} onChange={e => set('purpose', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update Voucher'}</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function VoucherOverlay({ rec, people, onClose }) {
  const person = people.find(p => p.id === rec.person_id);
  useEffect(() => { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }, []);
  return createPortal(
    <div className="overlay">
      <div className="voucher-print">
        <div className="v-head">
          <div><div className="v-brand disp">ABBASI LOAD FLOW</div><div className="v-sub">SALARY ADVANCE VOUCHER</div></div>
          <div className="v-ed mono">{rec.ed_no}</div>
        </div>
        <div className="v-grid">
          <div><span>Date</span><b>{fmtDate(rec.entry_date)}</b></div>
          <div><span>Employee</span><b>{person ? person.name : 'Unknown'}</b></div>
          <div><span>Category</span><b>{person ? person.type : '—'}</b></div>
          <div><span>Payment Mode</span><b>{rec.mode}</b></div>
          <div><span>Purpose</span><b>{rec.purpose || '—'}</b></div>
          <div><span>Amount</span><b className="v-amt">{fmt(rec.amount)}</b></div>
        </div>
        <div className="v-signs"><span>Prepared by</span><span>Approved by</span><span>Received by</span></div>
        <div className="v-foot">This is a system-generated voucher · ABBASI Load Flow</div>
      </div>
      <div className="overlay-actions no-print">
        <button className="btn primary small" onClick={() => window.print()}>{I.print} Print Again</button>
        <button className="btn ghost small" onClick={onClose}>Close</button>
      </div>
    </div>, document.body
  );
}

/* ============ ADVANCE REPORT ============ */
function Report({ advances, people, onDelete, onUpdate, user }) {
  const [q, setQ] = useState('');
  const [mon, setMon] = useState('');
  const [pf, setPf] = useState('');
  const [editing, setEditing] = useState(null);
  const { apply, Th } = useSort('entry_date', 'desc');
  const months = [...new Set(advances.map(a => a.entry_date ? a.entry_date.slice(0, 7) : ''))].filter(Boolean).sort().reverse();
  const names = [...new Set(advances.map(a => { const p = people.find(x => x.id === a.person_id); return p ? p.name : 'Unknown'; }))].sort();
  const list = [...advances]
    .filter(a => !q || (a.ed_no + (a.purpose || '') + a.mode).toLowerCase().includes(q.toLowerCase()) || (people.find(p => p.id === a.person_id)?.name || '').toLowerCase().includes(q.toLowerCase()))
    .filter(a => !mon || (a.entry_date && a.entry_date.slice(0, 7) === mon))
    .filter(a => !pf || (people.find(p => p.id === a.person_id)?.name === pf))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const sorted = apply(list, {
    ed_no: a => a.ed_no, entry_date: a => a.entry_date,
    name: a => { const p = people.find(x => x.id === a.person_id); return p ? p.name : ''; },
    type: a => { const p = people.find(x => x.id === a.person_id); return p ? p.type : ''; },
    mode: a => a.mode, purpose: a => a.purpose || '', amount: a => Number(a.amount || 0)
  });
  const total = list.reduce((s, a) => s + Number(a.amount), 0);
  const exportCSV = () => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['ED No', 'Date', 'Employee', 'Type', 'Mode', 'Purpose', 'Amount (Rs)'],
      ...list.map(a => { const p = people.find(x => x.id === a.person_id); return [a.ed_no, a.entry_date, p?.name || 'Unknown', p?.type || '—', a.mode, a.purpose, a.amount]; })]
      .map(r => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'abbasi-advance-report.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="card rise">
      <PrintHead title="Salary Advance Report" meta={`${list.length} entries · Total ${fmt(total)}`} />
      <div className="card-h"><h3>Advance Ledger</h3>
        <div style={{ display: 'flex', gap: 8 }} className="no-print">
          <button className="btn ghost small" onClick={exportCSV}>{I.dl} Export CSV</button>
          <button className="btn primary small" onClick={() => window.print()}>{I.print} Print Report</button>
        </div></div>
      <div className="filters no-print">
        <div className="search-box">{I.search}<input placeholder="Search ED no, name, purpose…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select value={mon} onChange={e => setMon(e.target.value)}><option value="">All months</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        <select value={pf} onChange={e => setPf(e.target.value)}><option value="">All parties</option>{names.map(n => <option key={n} value={n}>{n}</option>)}</select>
      </div>
      <div className="sumbar">
        <div className="sumbox hot"><div className="k">Total Advance</div><div className="v">{fmt(total)}</div></div>
        <div className="sumbox"><div className="k">Entries</div><div className="v">{list.length}</div></div>
        <div className="sumbox"><div className="k">Average</div><div className="v">{fmt(list.length ? Math.round(total / list.length) : 0)}</div></div>
      </div>
      {list.length === 0 ? <div className="empty"><div className="big">🗂</div>No advance entries match.</div>
        : <div className="tbl-wrap"><table>
            <thead><tr><Th k="ed_no">ED No</Th><Th k="entry_date">Date</Th><Th k="name">Employee</Th><Th k="type">Type</Th><Th k="mode">Mode</Th><Th k="purpose">Purpose</Th><Th k="amount" align="right">Amount</Th><th className="no-print"></th></tr></thead>
            <tbody>{sorted.map((a, i) => {
              const p = people.find(x => x.id === a.person_id);
              return (<tr key={a.ed_no} style={{ animationDelay: Math.min(i * 30, 300) + 'ms' }}>
                <td><span className="ed-pill">{a.ed_no}</span></td>
                <td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(a.entry_date)}</td>
                <td style={{ fontWeight: 600 }}>{p ? p.name : 'Unknown'}</td>
                <td><span className={p ? 'badge b-' + p.type : 'badge'}>{p ? p.type : '—'}</span></td>
                <td>{a.mode}</td>
                <td style={{ color: 'var(--muted)' }}>{a.purpose || '—'}</td>
                <td className="money" style={{ textAlign: 'right' }}>{fmt(a.amount)}</td>
                <td className="no-print" style={{ whiteSpace: 'nowrap' }}>
                  {canEdit(user, 'advance') && <button className="icon-btn edit" title="Edit" onClick={() => setEditing(a)}>{I.edit}</button>}
                  {canDelete(user, 'advance') && <button className="icon-btn" title="Delete" onClick={async () => { if (window.confirm('Delete ' + a.ed_no + '?')) { const { error } = await supabase.from('advances').delete().eq('id', a.id); if (error) alert('Delete failed: ' + error.message); else onDelete(a.id); } }}>{I.trash}</button>}
                </td></tr>);
            })}</tbody>
            <tfoot><tr><td colSpan="6">TOTAL ADVANCE</td><td className="money" style={{ textAlign: 'right' }}>{fmt(total)}</td><td className="no-print"></td></tr></tfoot>
          </table></div>}
      {editing && <Modal title={'Edit Voucher ' + editing.ed_no} onClose={() => setEditing(null)}><EditAdvanceForm rec={editing} people={people} onSave={onUpdate} onClose={() => setEditing(null)} /></Modal>}
    </div>
  );
}

/* ============ EMPLOYEE MONTHLY ============ */
function EmpMonthly({ people, advances, user }) {
  const staff = people.filter(p => p.type === 'Employee' || p.type === 'Loader');
  const [pid, setPid] = useState(staff[0] ? staff[0].id : '');
  const [mon, setMon] = useState(thisMonthKey());
  const { apply, Th } = useSort('entry_date', 'asc');
  const person = people.find(p => p.id === pid);
  const list = advances.filter(a => a.person_id === pid && a.entry_date && a.entry_date.slice(0, 7) === mon).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const sorted = apply(list, { ed_no: a => a.ed_no, entry_date: a => a.entry_date, mode: a => a.mode, purpose: a => a.purpose || '', amount: a => Number(a.amount || 0) });
  const total = list.reduce((s, a) => s + Number(a.amount), 0);
  return (
    <>
      <div className="card rise" style={{ padding: 20, marginBottom: 16 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 2fr' }}>
          <div className="field" style={{ marginBottom: 0 }}><label>Employee / Loader</label>
            <select value={pid} onChange={e => setPid(Number(e.target.value))}>{staff.map(p => <option key={p.id} value={p.id}>{p.name} · {p.type}</option>)}</select></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Month</label><input type="month" value={mon} onChange={e => setMon(e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0, justifyContent: 'flex-end' }}><button className="btn primary" onClick={() => window.print()}>{I.print} Print Statement</button></div>
        </div>
      </div>
      <div className="card rise">
        <PrintHead title={`Monthly Advance Statement · ${person ? person.name : ''}`} meta={monthLabel(mon) + ` · ${list.length} entries · Total ${fmt(total)}`} />
        <div className="card-h"><h3>{person ? person.name : 'Select employee'} — {monthLabel(mon)}</h3>
          <span className="tag">{person ? person.type : ''}{person && person.role ? ' · ' + person.role : ''}</span></div>
        {list.length === 0 ? <div className="empty"><div className="big">📄</div>No advance entries for this employee in {monthLabel(mon)}.</div>
          : <div className="tbl-wrap"><table>
              <thead><tr><Th k="ed_no">ED No</Th><Th k="entry_date">Date</Th><Th k="mode">Payment Mode</Th><Th k="purpose">Purpose</Th><Th k="amount" align="right">Amount</Th></tr></thead>
              <tbody>{sorted.map((a, i) => (<tr key={a.ed_no} style={{ animationDelay: i * 40 + 'ms' }}>
                <td><span className="ed-pill">{a.ed_no}</span></td><td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(a.entry_date)}</td>
                <td>{a.mode}</td><td style={{ color: 'var(--muted)' }}>{a.purpose || '—'}</td><td className="money" style={{ textAlign: 'right' }}>{fmt(a.amount)}</td></tr>))}</tbody>
              <tfoot><tr><td colSpan="4">TOTAL ADVANCE — {monthLabel(mon)}</td><td className="money" style={{ textAlign: 'right' }}>{fmt(total)}</td></tr></tfoot>
            </table></div>}
      </div>
    </>
  );
}

/* ============ FREIGHT ENTRY ============ */
function FreightEntry({ people, freights, onSave, onUpdate, onDelete, user }) {
  const loaders = people.filter(p => p.type === 'Loader');
  const [loaderId, setLoaderId] = useState('');
  const [gp, setGp] = useState('');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [filterLoader, setFilterLoader] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const { apply, Th } = useSort('entry_date', 'desc');
  const months = [...new Set(freights.map(f => f.entry_date ? f.entry_date.slice(0, 7) : ''))].filter(Boolean).sort().reverse();
  const filtered = [...freights]
    .filter(f => !q || (f.gate_pass || '').toLowerCase().includes(q.toLowerCase()) || (f.note || '').toLowerCase().includes(q.toLowerCase()))
    .filter(f => !filterLoader || f.loader_id === Number(filterLoader))
    .filter(f => !filterMonth || (f.entry_date && f.entry_date.slice(0, 7) === filterMonth))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const sorted = apply(filtered, {
    gate_pass: f => f.gate_pass, entry_date: f => f.entry_date,
    loader: f => { const l = people.find(p => p.id === f.loader_id); return l ? l.name : ''; },
    note: f => f.note || '', amount: f => Number(f.amount || 0)
  });
  const filteredTotal = filtered.reduce((s, f) => s + Number(f.amount || 0), 0);
  const submit = async e => {
    e.preventDefault();
    const loader = loaders.find(l => l.id === Number(loaderId));
    if (!loader) return setErr('Select the loader for this freight.');
    if (!gp.trim()) return setErr('Gate Pass number is required.');
    const { data: dup } = await supabase.from('freights').select('id').ilike('gate_pass', gp.trim()).limit(1);
    if (dup && dup.length) return setErr('Gate Pass No "' + gp.trim() + '" is already used — enter a unique number.');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr('Enter a valid freight amount.');
    setErr(''); setSaving(true);
    try {
      const { data, error } = await supabase.from('freights').insert({ gate_pass: gp.trim(), entry_date: date, loader_id: loader.id, amount: amt, note: note.trim() }).select().single();
      if (error) throw error;
      onSave(data); setGp(''); setAmount(''); setNote('');
    } catch (e2) { setErr(e2.message || 'Failed to save'); } finally { setSaving(false); }
  };
  const exportCSV = () => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Gate Pass', 'Date', 'Loader', 'Amount (Rs)', 'Note'],
      ...filtered.map(f => { const l = people.find(p => p.id === f.loader_id); return [f.gate_pass, f.entry_date, l?.name || 'Unknown', f.amount, f.note]; })]
      .map(r => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'abbasi-freight-report.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <>
      <form className="card rise" style={{ padding: 24, marginBottom: 16 }} onSubmit={submit}>
        <div className="card-h" style={{ padding: '0 0 16px', marginBottom: 16 }}><h3>Freight / Gatepass Entry</h3><span className="tag">credits loader ledger</span></div>
        {err && <div className="err">{err}</div>}
        {loaders.length === 0 && <div className="err">No loaders in register yet — add one under People Register.</div>}
        <div className="field"><label>Loader</label>
          <select value={loaderId} onChange={e => setLoaderId(e.target.value)}>
            <option value="">— select loader —</option>
            {loaders.map(l => <option key={l.id} value={l.id}>{l.name} · {l.role || 'Loader'}</option>)}</select></div>
        <div className="form-grid">
          <div className="field"><label>Gate Pass No</label><input value={gp} onChange={e => setGp(e.target.value)} placeholder="e.g. GP-1060" /></div>
          <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label>Freight Amount (Rs)</label><input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 7500" /></div>
        </div>
        <div className="field"><label>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Lahore consignments…" /></div>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add to Loader Ledger'}</button>
      </form>
      <div className="card rise">
        <div className="card-h"><h3>Freight Register</h3>
          <div style={{ display: 'flex', gap: 8 }} className="no-print">
            <button className="btn ghost small" onClick={exportCSV}>{I.dl} Export CSV</button>
            <button className="btn primary small" onClick={() => window.print()}>{I.print} Print</button></div></div>
        <div className="filters no-print">
          <div className="search-box">{I.search}<input placeholder="Search gate pass, note…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select value={filterLoader} onChange={e => setFilterLoader(e.target.value)}><option value="">All loaders</option>{loaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}><option value="">All months</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        </div>
        <div className="sumbar">
          <div className="sumbox hot"><div className="k">Total Freight</div><div className="v">{fmt(filteredTotal)}</div></div>
          <div className="sumbox"><div className="k">Entries</div><div className="v">{filtered.length}</div></div>
          <div className="sumbox"><div className="k">Average</div><div className="v">{fmt(filtered.length ? Math.round(filteredTotal / filtered.length) : 0)}</div></div>
        </div>
        {filtered.length === 0 ? <div className="empty"><div className="big">📦</div>No freight entries match your search.</div>
          : <div className="tbl-wrap"><table>
              <thead><tr><Th k="gate_pass">Gate Pass</Th><Th k="entry_date">Date</Th><Th k="loader">Loader</Th><Th k="note">Note</Th><Th k="amount" align="right">Amount</Th><th className="no-print"></th></tr></thead>
              <tbody>{sorted.map((f, i) => {
                const loader = people.find(p => p.id === f.loader_id);
                return (<tr key={f.id} style={{ animationDelay: Math.min(i * 30, 300) + 'ms' }}>
                  <td><span className="gp-pill">{f.gate_pass}</span></td><td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(f.entry_date)}</td>
                  <td style={{ fontWeight: 600 }}>{loader ? loader.name : 'Unknown'}</td><td style={{ color: 'var(--muted)' }}>{f.note || '—'}</td>
                  <td className="money" style={{ textAlign: 'right', color: 'var(--teal)' }}>+{fmt(f.amount)}</td>
                  <td className="no-print" style={{ whiteSpace: 'nowrap' }}>
                    {canEdit(user, 'freight') && <button className="icon-btn edit" title="Edit" onClick={() => setEditing(f)}>{I.edit}</button>}
                    {canDelete(user, 'freight') && <button className="icon-btn" title="Delete" onClick={async () => { if (window.confirm('Delete freight ' + f.gate_pass + '?')) { const { error } = await supabase.from('freights').delete().eq('id', f.id); if (error) alert('Delete failed: ' + error.message); else onDelete(f.id); } }}>{I.trash}</button>}
                  </td></tr>);
              })}</tbody>
              <tfoot><tr><td colSpan="4">TOTAL FREIGHT</td><td className="money" style={{ textAlign: 'right' }}>{fmt(filteredTotal)}</td><td className="no-print"></td></tr></tfoot>
            </table></div>}
      </div>
      {editing && <Modal title={'Edit Freight ' + editing.gate_pass} onClose={() => setEditing(null)}><EditFreightForm rec={editing} loaders={loaders} onSave={onUpdate} onClose={() => setEditing(null)} /></Modal>}
    </>
  );
}

function EditFreightForm({ rec, loaders, onSave, onClose }) {
  const [f, setF] = useState({ loader_id: rec.loader_id, gate_pass: rec.gate_pass, entry_date: rec.entry_date, amount: rec.amount, note: rec.note || '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault();
    const loader = loaders.find(l => l.id === Number(f.loader_id));
    if (!loader) return setErr('Select a loader.');
    if (!f.gate_pass.trim()) return setErr('Gate Pass number is required.');
    const { data: dup } = await supabase.from('freights').select('id').ilike('gate_pass', f.gate_pass.trim()).neq('id', rec.id).limit(1);
    if (dup && dup.length) return setErr('Gate Pass No "' + f.gate_pass.trim() + '" is already used by another entry.');
    const amt = Number(f.amount);
    if (!amt || amt <= 0) return setErr('Enter a valid amount.');
    setSaving(true);
    try {
      const { error } = await supabase.from('freights').update({ ...f, amount: amt }).eq('id', rec.id);
      if (error) throw error;
      onSave({ ...rec, ...f, amount: amt }); onClose();
    } catch (e2) { setErr(e2.message || 'Failed to update'); setSaving(false); }
  };
  return (
    <form onSubmit={submit}>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>Loader</label>
        <select value={f.loader_id} onChange={e => set('loader_id', Number(e.target.value))}>{loaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
      <div className="form-grid">
        <div className="field"><label>Gate Pass No</label><input value={f.gate_pass} onChange={e => set('gate_pass', e.target.value)} /></div>
        <div className="field"><label>Date</label><input type="date" value={f.entry_date} onChange={e => set('entry_date', e.target.value)} /></div>
        <div className="field"><label>Amount (Rs)</label><input type="number" min="1" value={f.amount} onChange={e => set('amount', e.target.value)} /></div>
      </div>
      <div className="field"><label>Note</label><input value={f.note} onChange={e => set('note', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update Freight'}</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

/* ============ LOADER LEDGER ============ */
function LoaderLedger({ people, advances, freights }) {
  const loaders = people.filter(p => p.type === 'Loader');
  const [lid, setLid] = useState(() => (loaders[0] ? loaders[0].id : ''));
  const [fromM, setFromM] = useState(thisMonthKey());
  const [toM, setToM] = useState(thisMonthKey());
  const [allTime, setAllTime] = useState(false);
  const { apply, Th } = useSort('date', 'asc');
  useEffect(() => { if (loaders.length && !loaders.find(l => l.id === lid)) setLid(loaders[0].id); }, [loaders.length, lid]);
  const loader = loaders.find(l => l.id === lid) || null;
  const monthOf = r => (r.date ? String(r.date).slice(0, 7) : '');
  const allRows = useMemo(() => {
    if (!lid) return [];
    const credit = freights.filter(f => f.loader_id === lid).map(f => ({ date: f.entry_date, ts: f.created_at || '', ref: f.gate_pass, refType: 'gp', desc: 'Freight · ' + (f.note || 'gatepass entry'), credit: Number(f.amount) || 0, debit: 0 }));
    const debit = advances.filter(a => a.person_id === lid).map(a => ({ date: a.entry_date, ts: a.created_at || '', ref: a.ed_no, refType: 'ed', desc: 'Advance · ' + (a.purpose || 'salary advance'), credit: 0, debit: Number(a.amount) || 0 }));
    const all = [...credit, ...debit].sort((a, b) => (String(a.date) === String(b.date) ? String(a.ts).localeCompare(String(b.ts)) : String(a.date).localeCompare(String(b.date))));
    let bal = 0;
    return all.map(r => { bal += r.credit - r.debit; return { ...r, bal }; });
  }, [lid, advances, freights]);
  const rows = useMemo(() => allTime ? allRows : allRows.filter(r => monthOf(r) >= fromM && monthOf(r) <= toM), [allRows, fromM, toM, allTime]);
  const opening = useMemo(() => { if (allTime) return 0; const before = allRows.filter(r => monthOf(r) < fromM); return before.length ? before[before.length - 1].bal : 0; }, [allRows, fromM, allTime]);
  if (loaders.length === 0) return <div className="card rise"><div className="empty"><div className="big">🧾</div>No loaders found.<br />Add a <b>Loader</b> in People Register.</div></div>;
  const totCredit = rows.reduce((s, r) => s + r.credit, 0);
  const totDebit = rows.reduce((s, r) => s + r.debit, 0);
  const closing = opening + totCredit - totDebit;
  const periodLabel = allTime ? 'All time' : (fromM === toM ? monthLabel(fromM) : monthLabel(fromM) + ' → ' + monthLabel(toM));
  const sorted = apply(rows, { date: r => r.date, ref: r => r.ref, desc: r => r.desc, debit: r => r.debit, credit: r => r.credit, bal: r => r.bal });
  const setThis = () => { setAllTime(false); setFromM(thisMonthKey()); setToM(thisMonthKey()); };
  const setLast = () => { const d = new Date(); const p = new Date(d.getFullYear(), d.getMonth() - 1, 1); const k = p.getFullYear() + '-' + String(p.getMonth() + 1).padStart(2, '0'); setAllTime(false); setFromM(k); setToM(k); };
  return (
    <>
      <div className="card rise" style={{ padding: 20, marginBottom: 16 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1.4fr 1fr 1fr auto' }}>
          <div className="field" style={{ marginBottom: 0 }}><label>Select Loader</label>
            <select value={lid} onChange={e => setLid(Number(e.target.value))}>{loaders.map(l => <option key={l.id} value={l.id}>{l.name} · {l.role || 'Loader'}</option>)}</select></div>
          <div className="field" style={{ marginBottom: 0 }}><label>From Month</label><input type="month" value={fromM} disabled={allTime} onChange={e => { setFromM(e.target.value); setAllTime(false); }} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>To Month</label><input type="month" value={toM} disabled={allTime} onChange={e => { setToM(e.target.value); setAllTime(false); }} /></div>
          <div className="field" style={{ marginBottom: 0, justifyContent: 'flex-end' }}><button className="btn primary" onClick={() => window.print()}>{I.print} Print Ledger</button></div>
        </div>
        <div className="tabs" style={{ padding: '14px 0 0', borderBottom: 'none' }}>
          <button className={'tab' + (!allTime && fromM === thisMonthKey() && toM === thisMonthKey() ? ' active' : '')} onClick={setThis}>This Month</button>
          <button className={'tab' + (!allTime && fromM === toM && fromM !== thisMonthKey() ? ' active' : '')} onClick={setLast}>Last Month</button>
          <button className={'tab' + (allTime ? ' active' : '')} onClick={() => setAllTime(v => !v)}>All Time</button>
          <span style={{ alignSelf: 'center', marginLeft: 10, fontSize: 12.5, color: 'var(--muted)' }}>Showing: <b style={{ color: 'var(--ink)' }}>{periodLabel}</b></span>
        </div>
      </div>
      {loader && (
        <div className="card rise">
          <PrintHead title={`Loader Ledger · ${loader.name}`} meta={`${periodLabel} · Opening ${fmt(opening)} + Freight ${fmt(totCredit)} − Advance ${fmt(totDebit)} = Closing ${fmt(closing)}`} />
          <div className="card-h"><h3>{loader.name} — Ledger</h3><span className="tag">{loader.phone || 'no phone'}{loader.role ? ' · ' + loader.role : ''}</span></div>
          <div className="sumbar">
            <div className="sumbox"><div className="k">Opening Balance</div><div className="v">{fmt(opening)}</div></div>
            <div className="sumbox"><div className="k">Freight Earned</div><div className="v" style={{ color: 'var(--teal)' }}>+{fmt(totCredit)}</div></div>
            <div className="sumbox"><div className="k">Advance Taken</div><div className="v" style={{ color: 'var(--coral)' }}>−{fmt(totDebit)}</div></div>
            <div className="sumbox hot"><div className="k">{closing >= 0 ? 'Balance Payable' : 'Recoverable'}</div><div className="v">{fmt(Math.abs(closing))}</div></div>
          </div>
          {rows.length === 0 && opening === 0 ? <div className="empty"><div className="big">📒</div>No ledger entries for {periodLabel.toLowerCase()}.</div>
            : <div className="tbl-wrap"><table>
                <thead><tr><Th k="date">Date</Th><Th k="ref">Ref</Th><Th k="desc">Particulars</Th><Th k="debit" align="right">Advance (−)</Th><Th k="credit" align="right">Freight (+)</Th><Th k="bal" align="right">Balance</Th></tr></thead>
                <tbody>
                  {!allTime && (<tr><td className="mono" style={{ fontSize: 12.5 }}>—</td><td><span className="ed-pill">OPEN</span></td><td>Opening balance before {monthLabel(fromM)}</td><td className="money" style={{ textAlign: 'right', color: 'var(--muted)' }}>—</td><td className="money" style={{ textAlign: 'right', color: 'var(--muted)' }}>—</td><td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(opening)}</td></tr>)}
                  {sorted.map((r, i) => (<tr key={i} style={{ animationDelay: Math.min(i * 25, 300) + 'ms' }}>
                    <td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(r.date)}</td><td><span className={r.refType === 'gp' ? 'gp-pill' : 'ed-pill'}>{r.ref}</span></td><td>{r.desc}</td>
                    <td className="money" style={{ textAlign: 'right', color: r.debit ? 'var(--coral)' : 'var(--muted)' }}>{r.debit ? fmt(r.debit) : '—'}</td>
                    <td className="money" style={{ textAlign: 'right', color: r.credit ? 'var(--teal)' : 'var(--muted)' }}>{r.credit ? fmt(r.credit) : '—'}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.bal)}</td></tr>))}
                </tbody>
                <tfoot><tr><td colSpan="3">TOTALS · {periodLabel}</td><td className="money" style={{ textAlign: 'right', color: 'var(--coral)' }}>{fmt(totDebit)}</td><td className="money" style={{ textAlign: 'right', color: 'var(--teal)' }}>{fmt(totCredit)}</td><td className="money" style={{ textAlign: 'right' }}>{fmt(closing)}</td></tr></tfoot>
              </table></div>}
        </div>
      )}
    </>
  );
}

/* ============ EXPENSE DETAIL ============ */
function EditExpenseForm({ rec, categories, onSave, onClose }) {
  const [f, setF] = useState({ entry_date: rec.entry_date, category_id: rec.category_id, detail: rec.detail || '', amount: rec.amount });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault();
    const amt = Number(f.amount);
    if (!amt || amt <= 0) return setErr('Enter a valid amount.');
    const { error } = await supabase.from('expenses').update({ ...f, amount: amt }).eq('id', rec.id);
    if (error) return setErr(error.message);
    onSave({ ...rec, ...f, amount: amt }); onClose();
  };
  return (
    <form onSubmit={submit}>
      {err && <div className="err">{err}</div>}
      <div className="form-grid">
        <div className="field"><label>Date</label><input type="date" value={f.entry_date} onChange={e => set('entry_date', e.target.value)} /></div>
        <div className="field"><label>Expense</label><select value={f.category_id} onChange={e => set('category_id', Number(e.target.value))}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label>Amount (Rs)</label><input type="number" min="1" value={f.amount} onChange={e => set('amount', e.target.value)} /></div>
      </div>
      <div className="field"><label>Detail</label><input value={f.detail} onChange={e => set('detail', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn primary" type="submit">Update Expense</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function ExpensePage({ expenses, categories, user, onSave, onUpdate, onDelete, onAddCategory, onDeleteCategory }) {
  const [tab, setTab] = useState('entry');
  const [date, setDate] = useState(today());
  const [catId, setCatId] = useState('');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(today().slice(0, 8) + '01');
  const [to, setTo] = useState(today());
  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState(null);
  const { apply, Th } = useSort('entry_date', 'desc');
  const { apply: applyCat, Th: ThCat } = useSort('name', 'asc');
  const catName = id => { const c = categories.find(x => x.id === id); return c ? c.name : 'Unknown'; };
  const submit = async e => {
    e.preventDefault();
    const cat = categories.find(c => String(c.id) === String(catId));
    if (!cat) return setErr('Select an expense type — add one in the "Expense Types" tab first.');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr('Enter a valid amount greater than zero.');
    setErr(''); setSaving(true);
    try {
      const { data, error } = await supabase.from('expenses').insert({ entry_date: date, category_id: cat.id, detail: detail.trim(), amount: amt }).select().single();
      if (error) throw error;
      onSave(data); setDetail(''); setAmount('');
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  };
  const list = [...expenses]
    .filter(x => x.entry_date >= from && x.entry_date <= to)
    .filter(x => { if (!q) return true; const hay = (catName(x.category_id) + ' ' + (x.detail || '') + ' ' + String(x.amount)).toLowerCase(); return hay.includes(q.toLowerCase()); })
    .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const sorted = apply(list, { entry_date: x => x.entry_date, category: x => catName(x.category_id), detail: x => x.detail || '', amount: x => Number(x.amount || 0) });
  const total = list.reduce((s, x) => s + Number(x.amount || 0), 0);
  const byCat = Object.values(list.reduce((m, x) => { const k = catName(x.category_id); m[k] = m[k] || { name: k, count: 0, total: 0 }; m[k].count++; m[k].total += Number(x.amount || 0); return m; }, {})).sort((a, b) => b.total - a.total);
  const sortedCats = applyCat(categories.map(c => ({ ...c, used: expenses.filter(x => x.category_id === c.id).length })), { name: c => c.name, used: c => c.used });
  const exportCSV = () => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Date', 'Expense', 'Detail', 'Amount (Rs)'], ...list.map(x => [x.entry_date, catName(x.category_id), x.detail, x.amount])].map(r => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'abbasi-expense-report.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const addCat = async e => { e.preventDefault(); const n = newCat.trim(); if (!n) return; const { data, error } = await supabase.from('expense_categories').insert({ name: n }).select().single(); if (error) { alert(error.message); return; } onAddCategory(data); setNewCat(''); };
  const delCat = async c => { if (expenses.some(x => x.category_id === c.id)) { alert('Cannot delete "' + c.name + '" — it is used in expense entries.'); return; } if (!window.confirm('Delete expense type "' + c.name + '"?')) return; const { error } = await supabase.from('expense_categories').delete().eq('id', c.id); if (error) alert(error.message); else onDeleteCategory(c.id); };
  const setThis = () => { setFrom(today().slice(0, 8) + '01'); setTo(today()); };
  const setLast = () => { const d = new Date(); const p1 = new Date(d.getFullYear(), d.getMonth() - 1, 1); const p2 = new Date(d.getFullYear(), d.getMonth(), 0); setFrom(p1.toISOString().slice(0, 10)); setTo(p2.toISOString().slice(0, 10)); };
  const setAll = () => { setFrom('2000-01-01'); setTo(today()); };
  return (
    <div className="card rise">
      <div className="tabs no-print">
        <button className={'tab' + (tab === 'entry' ? ' active' : '')} onClick={() => setTab('entry')}>Expense Entry</button>
        <button className={'tab' + (tab === 'report' ? ' active' : '')} onClick={() => setTab('report')}>Expense Report</button>
        <button className={'tab' + (tab === 'cats' ? ' active' : '')} onClick={() => setTab('cats')}>Expense Types ({categories.length})</button>
      </div>
      {tab === 'entry' && (
        <form style={{ padding: 24 }} onSubmit={submit}>
          {err && <div className="err">{err}</div>}
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="field"><label>Expense</label><select value={catId} onChange={e => setCatId(e.target.value)}><option value="">— select expense type —</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="field"><label>Amount (Rs)</label><input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2500" /></div>
          </div>
          <div className="field"><label>Detail</label><input value={detail} onChange={e => setDetail(e.target.value)} placeholder="e.g. Bike fuel for Lahore run…" /></div>
          {canEdit(user, 'expense') ? <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Expense'}</button> : <div className="err">You have view-only access for expenses.</div>}
        </form>
      )}
      {tab === 'report' && (<>
        <PrintHead title="Expense Report" meta={`${fmtDate(from)} → ${fmtDate(to)} · ${list.length} entries · Total ${fmt(total)}`} />
        <div className="filters no-print">
          <div className="search-box">{I.search}<input placeholder="Search expense, detail, amount…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} /><input type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button className="btn ghost small" onClick={exportCSV}>{I.dl} CSV</button><button className="btn primary small" onClick={() => window.print()}>{I.print} Print</button>
        </div>
        <div className="filters no-print" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="chip" onClick={setThis}>This Month</button><button className="chip" onClick={setLast}>Last Month</button><button className="chip" onClick={setAll}>All Time</button>
        </div>
        <div className="sumbar">
          <div className="sumbox hot"><div className="k">Total Expense</div><div className="v">{fmt(total)}</div></div>
          <div className="sumbox"><div className="k">Entries</div><div className="v">{list.length}</div></div>
          <div className="sumbox"><div className="k">Average</div><div className="v">{fmt(list.length ? Math.round(total / list.length) : 0)}</div></div>
        </div>
        {list.length === 0 ? <div className="empty"><div className="big">💸</div>No expenses in this period / search.</div>
          : <div className="tbl-wrap"><table>
              <thead><tr><Th k="entry_date">Date</Th><Th k="category">Expense</Th><Th k="detail">Detail</Th><Th k="amount" align="right">Amount</Th><th className="no-print"></th></tr></thead>
              <tbody>{sorted.map((x, i) => (<tr key={x.id} style={{ animationDelay: Math.min(i * 25, 300) + 'ms' }}>
                <td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(x.entry_date)}</td><td><span className="badge b-Customer">{catName(x.category_id)}</span></td>
                <td style={{ color: 'var(--muted)' }}>{x.detail || '—'}</td><td className="money" style={{ textAlign: 'right', color: 'var(--coral)' }}>−{fmt(x.amount)}</td>
                <td className="no-print" style={{ whiteSpace: 'nowrap' }}>
                  {canEdit(user, 'expense') && <button className="icon-btn edit" title="Edit" onClick={() => setEditing(x)}>{I.edit}</button>}
                  {canDelete(user, 'expense') && <button className="icon-btn" title="Delete" onClick={async () => { if (window.confirm('Delete this expense of ' + fmt(x.amount) + '?')) { const { error } = await supabase.from('expenses').delete().eq('id', x.id); if (error) alert('Delete failed: ' + error.message); else onDelete(x.id); } }}>{I.trash}</button>}
                </td></tr>))}</tbody>
              <tfoot><tr><td colSpan="3">TOTAL EXPENSE · {fmtDate(from)} → {fmtDate(to)}</td><td className="money" style={{ textAlign: 'right' }}>{fmt(total)}</td><td className="no-print"></td></tr></tfoot>
            </table></div>}
        {byCat.length > 0 && (<><div className="card-h" style={{ borderTop: '1px solid var(--line)' }}><h3>Expense-wise breakdown</h3><span className="tag">{byCat.length} types</span></div>
          <div className="tbl-wrap"><table><thead><tr><th>Expense Type</th><th>Entries</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>{byCat.map(b => (<tr key={b.name}><td style={{ fontWeight: 600 }}>{b.name}</td><td>{b.count}</td><td className="money" style={{ textAlign: 'right' }}>{fmt(b.total)}</td></tr>))}</tbody></table></div></>)}
      </>)}
      {tab === 'cats' && (
        <div style={{ padding: 24 }}>
          {canEdit(user, 'expense') && (<form onSubmit={addCat} className="form-grid" style={{ gridTemplateColumns: '2fr auto', alignItems: 'end' }}>
            <div className="field" style={{ marginBottom: 0 }}><label>New Expense Type</label><input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Fuel, Maintenance, Rent…" /></div>
            <button className="btn primary" type="submit">{I.plus} Add Type</button></form>)}
          <div className="tbl-wrap" style={{ marginTop: 18 }}><table>
            <thead><tr><ThCat k="name">Expense Type</ThCat><ThCat k="used">Entries Used</ThCat><th></th></tr></thead>
            <tbody>{sortedCats.map(c => (<tr key={c.id}><td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.used}</td>
              <td>{canDelete(user, 'expense') && <button className="icon-btn" title="Delete type" onClick={() => delCat(c)}>{I.trash}</button>}</td></tr>))}</tbody>
          </table></div>
        </div>
      )}
      {editing && <Modal title={'Edit Expense · ' + fmtDate(editing.entry_date)} onClose={() => setEditing(null)}><EditExpenseForm rec={editing} categories={categories} onSave={onUpdate} onClose={() => setEditing(null)} /></Modal>}
    </div>
  );
}

/* ============ VISIT ENTRY ============ */
const blankLine = () => ({ id: uid(), customer: '', contact_type: 'Visited', success: true, time_value: '', time_unit: 'mins', payment: 'Not Received', note: '' });
function VisitRowsEditor({ lines, setLines, customers }) {
  const setLine = (id, key, val) => setLines(ls => ls.map(l => l.id === id ? { ...l, [key]: val } : l));
  const addLine = () => setLines(ls => [...ls, blankLine()]);
  const rmLine = id => setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== id) : ls);
  return (<>
    <datalist id="custList">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
    <label className="field-label-sec">Customer stops on this run</label>
    {lines.map(l => (<div className="vrow" key={l.id}>
      <input list="custList" placeholder="Customer" value={l.customer} onChange={e => setLine(l.id, 'customer', e.target.value)} />
      <select value={l.contact_type} onChange={e => setLine(l.id, 'contact_type', e.target.value)}><option>Visited</option><option>Phone Call</option></select>
      <select value={String(l.success)} onChange={e => setLine(l.id, 'success', e.target.value === 'true')}><option value="true">Success</option><option value="false">Not Success</option></select>
      <div className="time-pair"><input type="number" min="0" placeholder="Time" value={l.time_value} onChange={e => setLine(l.id, 'time_value', e.target.value)} />
        <select value={l.time_unit} onChange={e => setLine(l.id, 'time_unit', e.target.value)}><option value="mins">mins</option><option value="hrs">hrs</option></select></div>
      <select value={l.payment} onChange={e => setLine(l.id, 'payment', e.target.value)}><option value="Received">Payment Received</option><option value="Not Received">Payment Pending</option></select>
      <input placeholder="Note" value={l.note} onChange={e => setLine(l.id, 'note', e.target.value)} />
      <button type="button" className="icon-btn" onClick={() => rmLine(l.id)} title="Remove row">{I.trash}</button>
    </div>))}
    <button type="button" className="btn ghost small" onClick={addLine}>{I.plus} Add Stop</button>
  </>);
}

function VisitEntry({ people, visits, onSave, onUpdate, onDelete, user }) {
  const [date, setDate] = useState(today());
  const [km, setKm] = useState('');
  const [lines, setLines] = useState([blankLine()]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const customers = people.filter(p => p.type === 'Customer' || p.type === 'Relation');
  const filteredRuns = useMemo(() => [...visits]
    .filter(v => !fromDate || v.visit_date >= fromDate).filter(v => !toDate || v.visit_date <= toDate)
    .filter(v => { if (!q) return true; const hay = (v.visit_date + ' ' + String(v.bike_km) + ' ' + (v.visit_entries || []).map(x => x.customer + ' ' + (x.note || '')).join(' ')).toLowerCase(); return hay.includes(q.toLowerCase()); })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')), [visits, q, fromDate, toDate]);
  const totalKm = filteredRuns.reduce((s, v) => s + Number(v.bike_km || 0), 0);
  const totalStops = filteredRuns.reduce((s, v) => s + (v.visit_entries ? v.visit_entries.length : 0), 0);
  const submit = async e => {
    e.preventDefault();
    if (!date) return setErr('Select the run date.');
    if (km === '' || Number(km) < 0) return setErr('Enter daily bike run in KM.');
    const filled = lines.filter(l => l.customer.trim());
    if (filled.length === 0) return setErr('Add at least one customer stop.');
    setErr(''); setSaving(true);
    try {
      const { data: visit, error: visitErr } = await supabase.from('visits').insert({ visit_date: date, bike_km: Number(km) }).select().single();
      if (visitErr) throw visitErr;
      const entries = filled.map(l => ({ visit_id: visit.id, customer: l.customer.trim(), contact_type: l.contact_type, success: l.success, time_value: Number(l.time_value) || 0, time_unit: l.time_unit, payment: l.payment, note: l.note.trim() }));
      const { error: entriesErr } = await supabase.from('visit_entries').insert(entries);
      if (entriesErr) throw entriesErr;
      onSave({ ...visit, visit_entries: entries }); setKm(''); setLines([blankLine()]);
    } catch (e2) { setErr(e2.message || 'Failed to save'); } finally { setSaving(false); }
  };
  return (
    <div className="grid-2 rise" style={{ alignItems: 'start' }}>
      <form className="card" style={{ padding: 24 }} onSubmit={submit}>
        <div className="card-h" style={{ padding: '0 0 16px', marginBottom: 16 }}><h3>Daily Customer Visit Run</h3><span className="tag">KM run · stops</span></div>
        {err && <div className="err">{err}</div>}
        <div className="form-grid">
          <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label>Daily Bike Run (KM)</label><input type="number" min="0" step="0.1" value={km} onChange={e => setKm(e.target.value)} placeholder="e.g. 42" /></div>
        </div>
        <VisitRowsEditor lines={lines} setLines={setLines} customers={customers} />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}><button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Visit Run'}</button></div>
      </form>
      <div className="card">
        <div className="card-h"><h3>Recent Runs</h3><span className="tag">{filteredRuns.length} of {visits.length} runs</span></div>
        <div className="filters no-print" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div className="search-box">{I.search}<input placeholder="Search customer, note, date…" value={q} onChange={e => setQ(e.target.value)} /></div></div>
        <div className="filters no-print" style={{ paddingTop: 8 }}>
          <div className="field" style={{ margin: 0, minWidth: 140 }}><label style={{ fontSize: 9.5 }}>From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
          <div className="field" style={{ margin: 0, minWidth: 140 }}><label style={{ fontSize: 9.5 }}>To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
          {(fromDate || toDate || q) && <button className="chip" onClick={() => { setQ(''); setFromDate(''); setToDate(''); }}>Clear</button>}</div>
        <div className="sumbar">
          <div className="sumbox hot"><div className="k">Total KM</div><div className="v">{totalKm} km</div></div>
          <div className="sumbox"><div className="k">Runs</div><div className="v">{filteredRuns.length}</div></div>
          <div className="sumbox"><div className="k">Total Stops</div><div className="v">{totalStops}</div></div></div>
        <div className="rlist">
          {filteredRuns.length === 0 && <div className="empty"><div className="big">🛵</div>No runs match your search.</div>}
          {filteredRuns.map(v => (<div className="rrow" key={v.id}>
            <span className="km-pill">{v.bike_km} km</span>
            <div><div className="nm">{fmtDate(v.visit_date)}</div><div className="dt">{v.visit_entries ? v.visit_entries.length : 0} stops · {v.visit_entries ? v.visit_entries.filter(x => x.contact_type === 'Visited').length : 0} visited</div></div>
            <div className="amt-r">{v.visit_entries ? v.visit_entries.filter(x => x.payment === 'Received').length : 0}/{v.visit_entries ? v.visit_entries.length : 0} paid</div>
            {canEdit(user, 'visit') && <button className="icon-btn edit" title="Edit run" onClick={() => setEditing(v)}>{I.edit}</button>}
            {canDelete(user, 'visit') && <button className="icon-btn" title="Delete run" onClick={async () => { if (window.confirm('Delete this visit run?')) { const { error } = await supabase.from('visits').delete().eq('id', v.id); if (error) alert('Delete failed: ' + error.message); else onDelete(v.id); } }}>{I.trash}</button>}
          </div>))}
        </div>
      </div>
      {editing && <Modal title={'Edit Visit Run — ' + fmtDate(editing.visit_date)} wide onClose={() => setEditing(null)}><EditVisitForm rec={editing} customers={customers} onSave={onUpdate} onClose={() => setEditing(null)} /></Modal>}
    </div>
  );
}

function EditVisitForm({ rec, customers, onSave, onClose }) {
  const [date, setDate] = useState(rec.visit_date);
  const [km, setKm] = useState(String(rec.bike_km));
  const [lines, setLines] = useState(() => (rec.visit_entries || []).map(x => ({ ...x, id: x.id || uid() })));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (km === '' || Number(km) < 0) return setErr('Enter valid KM.');
    const filled = lines.filter(l => l.customer.trim());
    if (filled.length === 0) return setErr('Keep at least one customer stop.');
    setSaving(true);
    try {
      await supabase.from('visits').update({ visit_date: date, bike_km: Number(km) }).eq('id', rec.id);
      await supabase.from('visit_entries').delete().eq('visit_id', rec.id);
      const entries = filled.map(l => ({ visit_id: rec.id, customer: l.customer.trim(), contact_type: l.contact_type, success: l.success, time_value: Number(l.time_value) || 0, time_unit: l.time_unit, payment: l.payment, note: l.note.trim() }));
      await supabase.from('visit_entries').insert(entries);
      onSave({ ...rec, visit_date: date, bike_km: Number(km), visit_entries: entries }); onClose();
    } catch (e2) { setErr(e2.message || 'Failed to update'); setSaving(false); }
  };
  return (
    <form onSubmit={submit}>
      {err && <div className="err">{err}</div>}
      <div className="form-grid">
        <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label>Daily Bike Run (KM)</label><input type="number" min="0" step="0.1" value={km} onChange={e => setKm(e.target.value)} /></div>
      </div>
      <VisitRowsEditor lines={lines} setLines={setLines} customers={customers} />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update Visit Run'}</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

/* ============ VISIT REPORTS ============ */
function VisitReports({ visits }) {
  const [tab, setTab] = useState('daily');
  const [fromDate, setFromDate] = useState(today().slice(0, 8) + '01');
  const [toDate, setToDate] = useState(today());
  const [fromMonth, setFromMonth] = useState(thisMonthKey());
  const [toMonth, setToMonth] = useState(thisMonthKey());

  /* ---- Daily Report: filter by date range ---- */
  const dayRuns = useMemo(() => [...visits]
    .filter(v => v.visit_date >= fromDate && v.visit_date <= toDate)
    .sort((a, b) => a.visit_date.localeCompare(b.visit_date)), [visits, fromDate, toDate]);

  const dayStops = dayRuns.flatMap(v => v.visit_entries || []);
  const dKm = dayRuns.reduce((s, v) => s + Number(v.bike_km || 0), 0);
  const dVisited = dayStops.filter(x => x.contact_type === 'Visited');
  const dCalls = dayStops.filter(x => x.contact_type === 'Phone Call');
  const dSuccess = dayStops.filter(x => x.success);
  const dPaid = dayStops.filter(x => x.payment === 'Received');

  /* ---- Monthly Report: filter by month range ---- */
  const monthRuns = useMemo(() => [...visits]
    .filter(v => v.visit_date && v.visit_date.slice(0, 7) >= fromMonth && v.visit_date.slice(0, 7) <= toMonth)
    .sort((a, b) => a.visit_date.localeCompare(b.visit_date)), [visits, fromMonth, toMonth]);

  const byDay = monthRuns.reduce((m, v) => {
    m[v.visit_date] = m[v.visit_date] || { km: 0, visited: [], calls: 0, paid: 0, stops: 0 };
    m[v.visit_date].km += Number(v.bike_km || 0);
    (v.visit_entries || []).forEach(x => {
      m[v.visit_date].stops++;
      if (x.contact_type === 'Visited') m[v.visit_date].visited.push(x.customer);
      else m[v.visit_date].calls++;
      if (x.payment === 'Received') m[v.visit_date].paid++;
    });
    return m;
  }, {});
  const dayKeys = Object.keys(byDay).sort();
  const mKm = dayKeys.reduce((s, k) => s + byDay[k].km, 0);
  const mVisitedCount = dayKeys.reduce((s, k) => s + byDay[k].visited.length, 0);
  const mTotalStops = dayKeys.reduce((s, k) => s + byDay[k].stops, 0);
  const mTotalPaid = dayKeys.reduce((s, k) => s + byDay[k].paid, 0);

  /* ---- Quick buttons ---- */
  const setThisMonth = () => { setFromMonth(thisMonthKey()); setToMonth(thisMonthKey()); setFromDate(today().slice(0, 8) + '01'); setToDate(today()); };
  const setLastMonth = () => {
    const d = new Date(); const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const k = p.getFullYear() + '-' + String(p.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
    setFromMonth(k); setToMonth(k); setFromDate(k + '-01'); setToDate(lastDay);
  };
  const setAllTime = () => { setFromMonth('2020-01'); setToMonth('2099-12'); setFromDate('2020-01-01'); setToDate('2099-12-31'); };
  const periodLabel = fromDate === toDate ? fmtDate(fromDate) : fmtDate(fromDate) + ' → ' + fmtDate(toDate);
  const monthPeriodLabel = fromMonth === toMonth ? monthLabel(fromMonth) : monthLabel(fromMonth) + ' → ' + monthLabel(toMonth);

  return (
    <div className="card rise">
      <div className="tabs no-print">
        <button className={'tab' + (tab === 'daily' ? ' active' : '')} onClick={() => setTab('daily')}>Daily Visit Report</button>
        <button className={'tab' + (tab === 'monthly' ? ' active' : '')} onClick={() => setTab('monthly')}>Monthly Bike Run (KM)</button>
      </div>

      {/* ===== DAILY VISIT REPORT ===== */}
      {tab === 'daily' && (<>
        <PrintHead title="Daily Customer Visit Report" meta={`${periodLabel} · ${dKm} km · ${dayStops.length} stops`} />
        <div className="filters no-print">
          <div className="field" style={{ margin: 0, minWidth: 150 }}><label style={{ fontSize: 9.5 }}>From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
          <div className="field" style={{ margin: 0, minWidth: 150 }}><label style={{ fontSize: 9.5 }}>To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
          <button className="chip" onClick={setThisMonth}>This Month</button>
          <button className="chip" onClick={setLastMonth}>Last Month</button>
          <button className="chip" onClick={setAllTime}>All Time</button>
          <span style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>{dayRuns.length} runs found</span>
          <button className="btn primary small" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>{I.print} Print</button>
        </div>
        <div className="sumbar">
          <div className="sumbox hot"><div className="k">Total Run</div><div className="v">{dKm} km</div></div>
          <div className="sumbox"><div className="k">Runs</div><div className="v">{dayRuns.length}</div></div>
          <div className="sumbox"><div className="k">Customers Visited</div><div className="v">{dVisited.length}</div></div>
          <div className="sumbox"><div className="k">Phone Calls</div><div className="v">{dCalls.length}</div></div>
          <div className="sumbox"><div className="k">Successful</div><div className="v">{dSuccess.length}</div></div>
          <div className="sumbox"><div className="k">Payments Received</div><div className="v">{dPaid.length}</div></div>
        </div>
        {dayRuns.length === 0
          ? <div className="empty"><div className="big">🛵</div>No visit runs between {fmtDate(fromDate)} and {fmtDate(toDate)}.</div>
          : dayRuns.map(v => {
              const stops = v.visit_entries || [];
              const rKm = Number(v.bike_km || 0);
              const rVisited = stops.filter(x => x.contact_type === 'Visited').length;
              const rCalls = stops.filter(x => x.contact_type === 'Phone Call').length;
              const rSuccess = stops.filter(x => x.success).length;
              const rPaid = stops.filter(x => x.payment === 'Received').length;
              return (
                <div key={v.id} className="tbl-wrap" style={{ borderTop: '1px solid var(--line)' }}>
                  <table>
                    <thead>
                      <tr><th colSpan="6" style={{ background: '#F7FAF6' }}>
                        Run — {fmtDate(v.visit_date)} · <span className="mono">{rKm} km</span>
                        <span style={{ float: 'right', fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
                          {rVisited} visited · {rCalls} calls · {rSuccess} success · {rPaid}/{stops.length} paid
                        </span>
                      </th></tr>
                      <tr><th>Customer</th><th>Contact Type</th><th>Result</th><th>Time Spent</th><th>Payment</th><th>Note</th></tr>
                    </thead>
                    <tbody>
                      {stops.map(x => (
                        <tr key={x.id}>
                          <td style={{ fontWeight: 600 }}>{x.customer}</td>
                          <td><span className={x.contact_type === 'Visited' ? 'badge b-Loader' : 'badge b-Customer'}>{x.contact_type}</span></td>
                          <td><span className={x.success ? 'badge b-Employee' : 'badge b-Relation'}>{x.success ? '✓ Success' : 'Not Success'}</span></td>
                          <td className="mono" style={{ fontSize: 12.5 }}>{x.time_value || '—'} {x.time_unit === 'hrs' ? 'hr' : 'min'}</td>
                          <td>{x.payment === 'Received' ? <span className="badge b-Employee">Received</span> : <span className="badge b-Loader">Pending</span>}</td>
                          <td style={{ color: 'var(--muted)' }}>{x.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
      </>)}

      {/* ===== MONTHLY BIKE RUN REPORT ===== */}
      {tab === 'monthly' && (<>
        <PrintHead title="Monthly Bike Run Report" meta={`${monthPeriodLabel} · Total Run ${mKm} km · ${mVisitedCount} customers visited`} />
        <div className="filters no-print">
          <div className="field" style={{ margin: 0, minWidth: 150 }}><label style={{ fontSize: 9.5 }}>From Month</label><input type="month" value={fromMonth} onChange={e => setFromMonth(e.target.value)} /></div>
          <div className="field" style={{ margin: 0, minWidth: 150 }}><label style={{ fontSize: 9.5 }}>To Month</label><input type="month" value={toMonth} onChange={e => setToMonth(e.target.value)} /></div>
          <button className="chip" onClick={setThisMonth}>This Month</button>
          <button className="chip" onClick={setLastMonth}>Last Month</button>
          <button className="chip" onClick={setAllTime}>All Time</button>
          <span style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>{dayKeys.length} days found</span>
          <button className="btn primary small" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>{I.print} Print</button>
        </div>
        <div className="sumbar">
          <div className="sumbox hot"><div className="k">Total Run</div><div className="v">{mKm} km</div></div>
          <div className="sumbox"><div className="k">Days Active</div><div className="v">{dayKeys.length}</div></div>
          <div className="sumbox"><div className="k">Customers Visited</div><div className="v">{mVisitedCount}</div></div>
          <div className="sumbox"><div className="k">Total Stops</div><div className="v">{mTotalStops}</div></div>
          <div className="sumbox"><div className="k">Payments</div><div className="v">{mTotalPaid}/{mTotalStops}</div></div>
        </div>
        {dayKeys.length === 0
          ? <div className="empty"><div className="big">🗓</div>No bike runs between {monthLabel(fromMonth)} and {monthLabel(toMonth)}.</div>
          : <div className="tbl-wrap">
            <table>
              <thead><tr><th>Date</th><th style={{ textAlign: 'right' }}>KM Run</th><th>Customers Visited</th><th style={{ textAlign: 'right' }}>Calls</th><th style={{ textAlign: 'right' }}>Payments</th></tr></thead>
              <tbody>
                {dayKeys.map((k, i) => (
                  <tr key={k} style={{ animationDelay: Math.min(i * 30, 300) + 'ms' }}>
                    <td className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(k)}</td>
                    <td className="money" style={{ textAlign: 'right' }}>{byDay[k].km} km</td>
                    <td>{byDay[k].visited.length ? byDay[k].visited.join(', ') : <span style={{ color: 'var(--muted)' }}>no visits</span>}</td>
                    <td style={{ textAlign: 'right' }}>{byDay[k].calls}</td>
                    <td style={{ textAlign: 'right' }}>{byDay[k].paid}/{byDay[k].stops}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td>TOTAL RUN — {monthPeriodLabel}</td>
                <td className="money" style={{ textAlign: 'right' }}>{mKm} km</td>
                <td>{mVisitedCount} customers visited</td>
                <td></td><td></td>
              </tr></tfoot>
            </table>
          </div>}
      </>)}
    </div>
  );
}

/* ============ PEOPLE REGISTER ============ */
function People({ people, onAdd, onDelete, onUpdate, user }) {
  const [tab, setTab] = useState('All');
  const [name, setName] = useState('');
  const [type, setType] = useState('Employee');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [joined, setJoined] = useState(today());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const { apply, Th } = useSort('name', 'asc');
  const types = ['Employee', 'Loader', 'Customer', 'Relation'];
  const counts = t => people.filter(p => p.type === t).length;
  const filteredPeople = people.filter(p => tab === 'All' || p.type === tab);
  const list = apply(filteredPeople, { name: p => p.name, type: p => p.type, role: p => p.role || '', phone: p => p.phone || '', joined: p => p.joined });
  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return setErr('Name is required.');
    setErr(''); setSaving(true);
    try {
      const { data, error } = await supabase.from('people').insert({ name: name.trim(), type, phone: phone.trim(), role: role.trim(), joined }).select().single();
      if (error) throw error;
      onAdd(data); setName(''); setPhone(''); setRole('');
    } catch (e2) { setErr(e2.message || 'Failed to save'); } finally { setSaving(false); }
  };
  return (<>
    {canEdit(user, 'people') && (<form className="card rise" style={{ padding: 24, marginBottom: 16 }} onSubmit={submit}>
      <div className="card-h" style={{ padding: '0 0 16px', marginBottom: 16 }}><h3>New Entry — Loader / Customer / Employee / Relation</h3></div>
      {err && <div className="err">{err}</div>}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="field"><label>Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Akram Din" /></div>
        <div className="field"><label>Category</label><select value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03xx xxxxxxx" /></div>
        <div className="field"><label>Role / Detail</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Loading Crew · A" /></div>
        <div className="field"><label>Joined</label><input type="date" value={joined} onChange={e => setJoined(e.target.value)} /></div>
        <div className="field" style={{ justifyContent: 'flex-end' }}><button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add to Register'}</button></div>
      </div></form>)}
    <div className="card rise">
      <div className="tabs">{['All', ...types].map(t => (<button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t}<span className="n">{t === 'All' ? people.length : counts(t)}</span></button>))}</div>
      {list.length === 0 ? <div className="empty"><div className="big">👥</div>Nothing in this category yet.</div>
        : <div className="tbl-wrap"><table>
            <thead><tr><Th k="name">Name</Th><Th k="type">Category</Th><Th k="role">Role / Detail</Th><Th k="phone">Phone</Th><Th k="joined">Joined</Th><th></th></tr></thead>
            <tbody>{list.map((p, i) => (<tr key={p.id} style={{ animationDelay: Math.min(i * 30, 300) + 'ms' }}>
              <td style={{ fontWeight: 600 }}>{p.name}</td><td><span className={'badge b-' + p.type}>{p.type}</span></td>
              <td style={{ color: 'var(--muted)' }}>{p.role || '—'}</td><td className="mono" style={{ fontSize: 12.5 }}>{p.phone || '—'}</td><td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(p.joined)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {canEdit(user, 'people') && <button className="icon-btn edit" title="Edit" onClick={() => setEditing(p)}>{I.edit}</button>}
                {canDelete(user, 'people') && <button className="icon-btn" title="Remove" onClick={async () => { if (window.confirm('Remove ' + p.name + '?')) { const { error } = await supabase.from('people').delete().eq('id', p.id); if (error) alert('Cannot delete: ' + error.message); else onDelete(p.id); } }}>{I.trash}</button>}
              </td></tr>))}</tbody></table></div>}
      {editing && <Modal title={'Edit — ' + editing.name} onClose={() => setEditing(null)}><EditPersonForm rec={editing} types={types} onSave={onUpdate} onClose={() => setEditing(null)} /></Modal>}
    </div></>
  );
}

function EditPersonForm({ rec, types, onSave, onClose }) {
  const [f, setF] = useState({ name: rec.name, type: rec.type, phone: rec.phone || '', role: rec.role || '', joined: rec.joined });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Name is required.');
    setSaving(true);
    try {
      const { error } = await supabase.from('people').update(f).eq('id', rec.id);
      if (error) throw error;
      onSave({ ...rec, ...f }); onClose();
    } catch (e2) { setErr(e2.message || 'Failed to update'); setSaving(false); }
  };
  return (
    <form onSubmit={submit}>
      {err && <div className="err">{err}</div>}
      <div className="form-grid">
        <div className="field"><label>Full Name</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="field"><label>Category</label><select value={f.type} onChange={e => set('type', e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label>Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div className="field"><label>Role / Detail</label><input value={f.role} onChange={e => set('role', e.target.value)} /></div>
        <div className="field"><label>Joined</label><input type="date" value={f.joined} onChange={e => set('joined', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update Person'}</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

/* ============ ROOT APP ============ */
export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ people: [], advances: [], freights: [], visits: [], expenses: [], categories: [] });
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printRec, setPrintRec] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
          if (profile && profile.active) setUser({ ...profile, authId: session.user.id, email: session.user.email });
          setLoading(false);
        });
      } else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') setUser(null); });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => { if (user) fetchAll().then(setData); }, [user]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3400); return () => clearTimeout(t); }, [toast]);
  const notify = (msg, type = 'ok') => setToast({ msg, type, id: uid() });
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };
  if (loading) return <div className="login-page"><div className="login-card"><h2>Loading…</h2></div></div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  const addAdvance = (rec, andPrint) => { setData(d => ({ ...d, advances: [...d.advances, rec] })); notify('Advance ' + rec.ed_no + ' saved'); if (andPrint) setPrintRec(rec); };
  const updateAdvance = rec => { setData(d => ({ ...d, advances: d.advances.map(a => a.id === rec.id ? rec : a) })); notify('Voucher updated'); };
  const delAdvance = id => { setData(d => ({ ...d, advances: d.advances.filter(a => a.id !== id) })); notify('Entry deleted', 'warn'); };
  const addFreight = f => { setData(d => ({ ...d, freights: [...d.freights, f] })); notify('Freight added'); };
  const updateFreight = f => { setData(d => ({ ...d, freights: d.freights.map(x => x.id === f.id ? f : x) })); notify('Freight updated'); };
  const delFreight = id => { setData(d => ({ ...d, freights: d.freights.filter(x => x.id !== id) })); notify('Freight deleted', 'warn'); };
  const addVisit = v => { setData(d => ({ ...d, visits: [...d.visits, v] })); notify('Visit run saved'); };
  const updateVisit = vv => { setData(d => ({ ...d, visits: d.visits.map(r => r.id === vv.id ? vv : r) })); notify('Visit updated'); };
  const delVisit = id => { setData(d => ({ ...d, visits: d.visits.filter(r => r.id !== id) })); notify('Visit deleted', 'warn'); };
  const addPerson = p => { setData(d => ({ ...d, people: [...d.people, p] })); notify('Person added'); };
  const updatePerson = p => { setData(d => ({ ...d, people: d.people.map(x => x.id === p.id ? p : x) })); notify('Person updated'); };
  const delPerson = id => { setData(d => ({ ...d, people: d.people.filter(p => p.id !== id) })); };
  const addExpense = x => { setData(d => ({ ...d, expenses: [...d.expenses, x] })); notify('Expense ' + fmt(x.amount) + ' saved'); };
  const updateExpense = x => { setData(d => ({ ...d, expenses: d.expenses.map(r => r.id === x.id ? x : r) })); notify('Expense updated'); };
  const delExpense = id => { setData(d => ({ ...d, expenses: d.expenses.filter(r => r.id !== id) })); notify('Expense deleted', 'warn'); };
  const addCategory = c => { setData(d => ({ ...d, categories: [...d.categories, c] })); notify('Expense type "' + c.name + '" added'); };
  const delCategory = id => { setData(d => ({ ...d, categories: d.categories.filter(c => c.id !== id) })); notify('Expense type deleted', 'warn'); };
  return (
    <div className="app">
      <Sidebar view={view} setView={setView} people={data.people} advances={data.advances} freights={data.freights} user={user} onLogout={handleLogout} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main">
        <Topbar view={view} setView={setView} user={user} onMenu={() => setMenuOpen(true)} />
        {view === 'dashboard' && <Dashboard people={data.people} advances={data.advances} freights={data.freights} visits={data.visits} expenses={data.expenses} setView={setView} user={user} />}
        {view === 'entry' && canView(user, 'entry') && <EntryForm people={data.people} onSave={addAdvance} user={user} />}
        {view === 'report' && canView(user, 'report') && <Report advances={data.advances} people={data.people} onDelete={delAdvance} onUpdate={updateAdvance} user={user} />}
        {view === 'empMonthly' && canView(user, 'empMonthly') && <EmpMonthly people={data.people} advances={data.advances} user={user} />}
        {view === 'freight' && canView(user, 'freight') && <FreightEntry people={data.people} freights={data.freights} onSave={addFreight} onUpdate={updateFreight} onDelete={delFreight} user={user} />}
        {view === 'ledger' && canView(user, 'ledger') && <LoaderLedger people={data.people} advances={data.advances} freights={data.freights} />}
        {view === 'expense' && canView(user, 'expense') && <ExpensePage expenses={data.expenses} categories={data.categories} user={user} onSave={addExpense} onUpdate={updateExpense} onDelete={delExpense} onAddCategory={addCategory} onDeleteCategory={delCategory} />}
        {view === 'visit' && canView(user, 'visit') && <VisitEntry people={data.people} visits={data.visits} onSave={addVisit} onUpdate={updateVisit} onDelete={delVisit} user={user} />}
        {view === 'visitReports' && canView(user, 'visitReports') && <VisitReports visits={data.visits} />}
        {view === 'people' && canView(user, 'people') && <People people={data.people} onAdd={addPerson} onDelete={delPerson} onUpdate={updatePerson} user={user} />}
        {view === 'userManagement' && <UserManagement user={user} />}
      </main>
      {toast && <div key={toast.id} className={'toast' + (toast.type === 'warn' ? ' warn' : '')}>✓ {toast.msg}</div>}
      {printRec && <VoucherOverlay rec={printRec} people={data.people} onClose={() => setPrintRec(null)} />}
    </div>
  );
}
