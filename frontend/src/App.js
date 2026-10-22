import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, Banknote, Bell, BarChart3, ChevronDown, CircleUserRound, ClipboardCheck, Clock3, DoorOpen, LayoutDashboard, Menu, RadioTower, Search, ShieldCheck, Spade, Table2, Users, WalletCards, X, Check } from 'lucide-react';
import { io } from 'socket.io-client';
import api, { messageFromError } from './services/api';
import Dashboard from './pages/Dashboard';
import PlayerPortal from './pages/PlayerPortal';
import ModulePage from './pages/ModulePage';
import './styles/app.css';

const NAV = [
  { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { section: 'Club Operations', items: [
    { id: 'players', label: 'Players', icon: Users },
    { id: 'staff', label: 'Staff & Access', icon: ShieldCheck },
    { id: 'tables', label: 'Tables & Floor', icon: Table2 },
    { id: 'waitlist', label: 'Waiting List', icon: Clock3 },
    { id: 'sessions', label: 'Game Sessions', icon: Activity },
  ]},
  { section: 'Cash & Compliance', items: [
    { id: 'transactions', label: 'Cashier Ledger', icon: Banknote },
    { id: 'chips', label: 'Chip Inventory', icon: WalletCards },
    { id: 'kyc', label: 'KYC Review', icon: BadgeCheck },
    { id: 'chipRequests', label: 'Chip Purchase Requests', icon: WalletCards },
    { id: 'memberships', label: 'Memberships', icon: CircleUserRound },
    { id: 'reconciliation', label: 'Daily Reconciliation', icon: ClipboardCheck },
  ]},
  { section: 'Insights & Control', items: [
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Trail', icon: RadioTower },
  ]},
];

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [signupStep, setSignupStep] = useState('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (nextMode) => {
    setMode(nextMode); setSignupStep('details'); setError(''); setNotice(''); setOtp('');
  };

  const submit = async (e) => {
    e.preventDefault(); setError(''); setNotice(''); setLoading(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/login', { identifier: email.trim(), password });
        localStorage.setItem('trc_token', data.token);
        localStorage.setItem('trc_user', JSON.stringify(data.user));
        onLogin(data.user);
        return;
      }

      if (signupStep === 'details') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const { data } = await api.post('/auth/signup/request-otp', { name, phone, email, password });
        setSignupStep('otp');
        setNotice(data.message || 'OTP sent to your email.');
        return;
      }

      const { data } = await api.post('/auth/signup/verify-otp', { email, otp });
      localStorage.setItem('trc_token', data.token);
      localStorage.setItem('trc_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response ? messageFromError(err) : (err.message || 'Something went wrong'));
    } finally { setLoading(false); }
  };

  return <div className="login-shell"><div className="login-art"><div className="login-orb"/><img className="login-logo" src="/royals-logo.png" alt="THE ROYALS CLUB"/><div className="login-brand-line"/><p>PRECISION. TRUST. EXCELLENCE.</p><h1>One club.<br/><span>One royal experience.</span></h1><div className="login-footer">PRIVATE CLUB MANAGEMENT SUITE <span>•</span> THE ROYALS CLUB</div></div><form className="login-card" onSubmit={submit}>
    <div className="eyebrow">SECURE CLUB ACCESS</div>
    <h2>{mode === 'signup' ? (signupStep === 'otp' ? 'Verify your email' : 'Create your account') : 'Welcome back'}</h2>
    <p className="muted">{mode === 'signup' ? (signupStep === 'otp' ? `Enter the 6-digit code sent to ${email}.` : 'Register as a player. Your account is created only after email OTP verification.') : 'Sign in with your email or mobile number and password.'}</p>
    {error && <div className="alert error">{error}</div>}
    {notice && <div className="alert success">{notice}</div>}
    {mode === 'signup' && signupStep === 'details' && <>
      <label>Full name<input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name" required maxLength={100}/></label>
      <label>Mobile number<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. +919876543210" autoComplete="tel" required maxLength={16}/></label>
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
      <label>Confirm password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>
      <p className="form-note">A verification code will be sent to your email. Staff accounts can only be created by authorized management.</p>
    </>}
    {mode === 'signup' && signupStep === 'otp' && <>
      <label>Email verification OTP<input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" pattern="[0-9]{6}" minLength={6} maxLength={6} required/></label>
      <button className="btn subtle full" type="button" disabled={loading} onClick={async()=>{setError('');setNotice('');setLoading(true);try{const {data}=await api.post('/auth/signup/request-otp',{name,phone,email,password});setNotice(data.message||'A new OTP has been sent.');}catch(err){setError(messageFromError(err));}finally{setLoading(false);}}}>Resend OTP</button>
      <button className="btn subtle full" type="button" onClick={()=>{setSignupStep('details');setOtp('');setError('');setNotice('');}}>Edit registration details</button>
    </>}
    {mode === 'login' && <>
      <label>Email or mobile number<input type="text" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email or mobile number" autoComplete="username" required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/></label>
    </>}
    <button className="btn primary full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in securely' : signupStep === 'otp' ? 'Verify OTP & create account' : 'Send email verification OTP'}</button>
    <p className="auth-switch">{mode==='signup'?'Already registered?':'New to the club?'} <button type="button" onClick={()=>switchMode(mode==='signup'?'login':'signup')}>{mode==='signup'?'Sign in':'Create player account'}</button></p>
    <p className="login-hint"><ShieldCheck size={15}/> Protected by role-based access</p>
  </form></div>;
}
export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('trc_user') || 'null'); } catch { return null; } });
  const [page, setPage] = useState('dashboard'); const [mobileNav, setMobileNav] = useState(false); const [globalSearch, setGlobalSearch] = useState(''); const [socketStatus, setSocketStatus] = useState('Connecting notifications'); const [notifications, setNotifications] = useState([]); const [showNotifications, setShowNotifications] = useState(false);
  const allItems = useMemo(() => NAV.flatMap(s => s.items), []);
  useEffect(() => { if (!user) return; api.get('/').then(()=>setSocketStatus('API online')).catch(()=>setSocketStatus('API unavailable')); const token=localStorage.getItem('trc_token'); if(!token)return; const socket=io((process.env.REACT_APP_API_URL||'http://localhost:5000/api').replace(/\/api\/?$/,''),{auth:{token},transports:['polling','websocket']}); const events=['player:created','table:updated','waitlist:updated','session:started','session:ended','transaction:created']; socket.on('connect',()=>setSocketStatus('Live notifications online')); socket.on('disconnect',()=>setSocketStatus('Notifications disconnected')); socket.on('connect_error',()=>setSocketStatus('Notifications unavailable')); events.forEach(event=>socket.on(event,payload=>setNotifications(prev=>[{id:`${Date.now()}-${Math.random()}`,event,message:payload?.message||event,at:new Date()},...prev].slice(0,30)))); return ()=>socket.disconnect(); }, [user]);
  const current = allItems.find(i=>i.id===page) || {label:'Dashboard', icon:LayoutDashboard};
  const logout = () => { localStorage.removeItem('trc_token'); localStorage.removeItem('trc_user'); setUser(null); setPage('dashboard'); };
  if (!user) return <Login onLogin={setUser}/>;
  if (user.role === 'player') return <PlayerPortal user={user} onLogout={logout}/>;
  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close menu"/>}
    <aside className={`sidebar ${mobileNav?'show':''}`}>
      <div className="brand"><img src="/royals-logo.png" alt="The Royals Club"/><div><b>THE ROYALS</b><span>CLUB MANAGEMENT</span></div><button className="icon-button mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="club-pill"><span className="status-dot"/> SINGLE CLUB OPERATIONS</div>
      <nav>{NAV.map(group=><div className="nav-group" key={group.section}><div className="nav-caption">{group.section}</div>{group.items.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setMobileNav(false);}}><Icon size={18}/><span>{item.label}</span>{item.id==='waitlist'&&<span className="nav-accent"/>}</button>})}</div>)}</nav>
      <div className="sidebar-bottom"><div className="online-row"><span className="status-dot"/><div><b>{socketStatus}</b><small>Environment status</small></div></div><div className="profile-mini"><div className="avatar">{(user.name||'O').slice(0,1).toUpperCase()}</div><div className="profile-info"><b>{user.name}</b><span>{String(user.role||'staff').replaceAll('_',' ')}</span></div><button title="Sign out" className="icon-button" onClick={logout}><DoorOpen size={17}/></button></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs"><span>THE ROYALS CLUB</span><b>/</b><strong>{current.label}</strong></div></div><div className="topbar-right"><div className="search-wrap"><Search size={16}/><input placeholder="Search this section…" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)}/>{globalSearch&&<button onClick={()=>setGlobalSearch('')}><X size={14}/></button>}</div><div className="notification-wrap"><button className="icon-button notification-button" onClick={()=>setShowNotifications(v=>!v)} title="Operational notifications"><Bell size={17}/>{notifications.length>0&&<span className="notification-count">{notifications.length>9?'9+':notifications.length}</span>}</button>{showNotifications&&<div className="notification-popover"><div className="notification-pop-head"><div><b>Operational notifications</b><small>{notifications.length} recent event(s)</small></div><button className="icon-button" onClick={()=>setNotifications([])} title="Clear notifications"><Check size={15}/></button></div>{notifications.length===0?<p className="notification-empty">No notifications yet. Operational events will appear here while you are connected.</p>:notifications.map(n=><div className="notification-item" key={n.id}><span className="notification-dot"/><div><b>{n.message}</b><small>{n.event} · {n.at.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</small></div></div>)}</div>}</div><div className="topbar-divider"/><div className="user-chip"><div className="avatar small">{(user.name||'O').slice(0,1).toUpperCase()}</div><div><b>{user.name}</b><small>{String(user.role||'staff').replaceAll('_',' ')}</small></div><ChevronDown size={15}/></div></div></header>
      <div className="page-content">{page==='dashboard'?<Dashboard onNavigate={setPage}/>:<ModulePage module={page} search={globalSearch} user={user}/>}</div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} THE ROYALS CLUB</span><span><Spade size={12}/> PRIVATE CLUB OPERATIONS <i/> BLACK & GOLD EDITION</span></footer>
    </main>
  </div>;
}
