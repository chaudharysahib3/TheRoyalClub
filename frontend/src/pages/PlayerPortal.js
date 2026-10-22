import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CircleUserRound, RefreshCw, Spade, Table2, ShieldCheck, Wallet, History, Upload, UserRound, Coins, LogOut } from 'lucide-react';
import api, { messageFromError } from '../services/api';

const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
const date = (d) => d ? new Date(d).toLocaleString('en-IN') : '—';
const statusClass = (s) => ['approved','active','completed','seated','approved_demo','paid_verified'].includes(String(s).toLowerCase()) ? 'green' : ['rejected','cancelled','expired','failed','payment_setup_failed'].includes(String(s).toLowerCase()) ? 'red' : 'gold';

export default function PlayerPortal({ user, onLogout }) {
  const [profile, setProfile] = useState(null), [tables, setTables] = useState([]), [entries, setEntries] = useState([]);
  const [wallet, setWallet] = useState(null), [transactions, setTransactions] = useState([]), [purchaseRequests, setPurchaseRequests] = useState([]);
  const [kycRecords, setKycRecords] = useState([]), [memberships, setMemberships] = useState([]), [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState('overview'), [game, setGame] = useState("Texas Hold'em");
  const [amount, setAmount] = useState(''),
  [documentType, setDocumentType] = useState('government_id'),
  [kycDocument, setKycDocument] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', dateOfBirth: '' });
  const kycApproved = kycRecords.some(record => record.status === 'approved');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, t, w, wl, k, m, s] = await Promise.all([
        api.get('/player-portal/me'), api.get('/player-portal/tables'), api.get('/player-portal/wallet'),
        api.get('/player-portal/waiting-list'), api.get('/player-portal/kyc'), api.get('/player-portal/membership'), api.get('/player-portal/sessions')
      ]);
      setProfile(p.data.player); setProfileForm({ name: p.data.player.name || '', phone: p.data.player.phone || '', dateOfBirth: p.data.player.dateOfBirth ? new Date(p.data.player.dateOfBirth).toISOString().slice(0,10) : '' });
      setTables(t.data.tables || []); setWallet(w.data.wallet || null); setTransactions(w.data.transactions || []); setPurchaseRequests(w.data.purchaseRequests || []);
      setEntries(wl.data.entries || []); setKycRecords(k.data.records || []); setMemberships(m.data.memberships || []); setSessions(s.data.sessions || []);
    } catch (e) { setError(messageFromError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const run = async (action, successMessage) => {
    setBusy(true); setError(''); setNotice('');
    try { const response = await action(); setNotice(successMessage || response?.data?.message || 'Saved successfully'); await load(); return response; }
    catch (e) { setError(messageFromError(e)); return null; }
    finally { setBusy(false); }
  };
  const saveProfile = (e) => { e.preventDefault(); run(() => api.patch('/player-portal/me', profileForm), 'Profile updated successfully.'); };
  const submitKyc = (e) => {
    e.preventDefault();
    if (!kycDocument) { setError('Please choose a PDF, JPG or PNG document.'); return; }
    const fd = new FormData(); fd.append('documentType', documentType); fd.append('document', kycDocument);
    run(() => api.post('/player-portal/kyc', fd, { headers: { 'Content-Type': 'multipart/form-data' } }), 'KYC document submitted for review.');
    setKycDocument(null); e.currentTarget.reset();
  };
  const purchase = async (e) => {
    e.preventDefault(); setError(''); setNotice('');
    if (!kycApproved) { setError('Approved KYC is required before chip purchase.'); return; }
    setBusy(true);
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = window.document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
          script.onload = resolve; script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your connection and retry.'));
          window.document.body.appendChild(script);
        });
      }
      const idempotencyKey = window.crypto?.randomUUID ? window.crypto.randomUUID() : `trc-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      const orderResponse = await api.post('/payments/razorpay/order', { amount: Number(amount) }, { headers: { 'Idempotency-Key': idempotencyKey } });
      const order = orderResponse.data;
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: 'THE ROYALS CLUB',
        description: `Chip purchase — ₹${Number(amount).toFixed(2)} = ${Number(amount).toLocaleString('en-IN')} chips`,
        order_id: order.orderId, prefill: { name: profile?.name || user.name || '', email: profile?.email || user.email || '', contact: profile?.phone || '' },
        notes: { purchaseRequestId: order.request?._id || '' },
        theme: { color: '#c9a45c' },
        handler: async (response) => {
          try {
            await api.post('/payments/razorpay/verify', response);
            setNotice('Payment verified. Your purchase is waiting for owner approval. Chips will appear after approval.');
          } catch (verifyError) {
            setError('Checkout returned success, but the server could not verify and record the payment: ' + messageFromError(verifyError) + ' Do not pay again yet. Refresh purchase history and contact the club owner if the request remains pending; no chips are credited until server verification and owner approval.');
          } finally { await load(); setBusy(false); setAmount(''); }
        },
        modal: { ondismiss: async () => { setNotice('Checkout closed. No chips are credited unless payment is verified and approved.'); await load(); setBusy(false); } }
      });
      checkout.on('payment.failed', async (response) => {
        setError(response?.error?.description || 'Payment attempt failed. No chips have been credited. If your bank shows a debit, check its reversal status with your bank/gateway.');
        await load(); setBusy(false);
      });
      checkout.open();
    } catch (err) { setError(messageFromError(err)); setBusy(false); }
  };
  const requestSeat = (e) => { e.preventDefault(); run(() => api.post('/player-portal/waiting-list', { preferredGame: game }), 'Waiting-list request submitted.'); };
  const cancelWaitlist = (id) => run(() => api.patch(`/player-portal/waiting-list/${id}/cancel`), 'Waiting-list request cancelled.');
  const nav = [
    ['overview','Overview'], ['profile','Profile & membership'], ['kyc','KYC documents'], ['wallet','Wallet & chip purchase'], ['tables','Tables & waiting list'], ['sessions','Game history']
  ];
  return <div className="player-portal">
    <header className="portal-top"><div className="portal-brand"><img src="/royals-logo.png" alt="The Royals Club"/><div><b>THE ROYALS CLUB</b><small>MEMBER PORTAL</small></div></div><div className="portal-user"><span>{user.name}</span><button className="btn subtle" onClick={onLogout}><LogOut size={15}/> Sign out</button></div></header>
    <main className="portal-main">
      <div className="page-heading"><div><div className="eyebrow">CUSTOMER PORTAL</div><h1>Welcome, <span>{(profile?.name || user.name || 'Member').split(' ')[0]}.</span></h1><p>Manage your profile, membership, KYC and club activity.</p></div><button className="btn subtle" onClick={load} disabled={busy}><RefreshCw size={15}/> Refresh</button></div>
      {error && <div className="alert error" role="alert">{error}</div>}{notice && <div className="alert success" role="status">{notice}</div>}
      {!kycApproved && <div className="alert warning" role="status"><ShieldCheck size={16}/> KYC approval is required before chip purchase requests or waiting-list access. Upload your documents in KYC documents and wait for owner/staff review.</div>}
      <nav className="portal-nav" aria-label="Customer sections">{nav.map(([id,label])=><button key={id} className={`portal-nav-item ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>)}</nav>
      {loading ? <section className="panel"><p>Loading your customer information…</p></section> : <>
      {tab==='overview' && <>
        <div className="portal-metrics">
          <section className="panel portal-stat"><CircleUserRound/><small>Player ID</small><strong>{profile?.playerId || 'Pending'}</strong></section>
          <section className="panel portal-stat"><Spade/><small>Membership</small><strong>{profile?.membershipStatus || 'none'}</strong></section>
          <section className="panel portal-stat"><ShieldCheck/><small>KYC documents</small><strong>{kycRecords.length ? `${kycRecords.filter(x=>x.status==='approved').length} approved / ${kycRecords.length}` : 'Not submitted'}</strong></section>
          <section className="panel portal-stat"><Table2/><small>Open tables</small><strong>{tables.length}</strong></section>
        </div>
        <div className="portal-bottom-grid">
          <section className="panel"><div className="panel-head"><div><div className="eyebrow">MEMBER DETAILS</div><h2>Your profile</h2></div><UserRound/></div><div className="portal-detail"><span>Full name</span><b>{profile?.name}</b><span>Email</span><b>{profile?.email || user.email}</b><span>Phone</span><b>{profile?.phone || 'Not added'}</b><span>Membership ID</span><b>{profile?.membershipId || 'Pending'}</b></div><button className="btn primary" onClick={()=>setTab('profile')}>View profile & membership</button></section>
          <section className="panel"><div className="panel-head"><div><div className="eyebrow">ACCOUNT ACTIVITY</div><h2>Recorded chip activity</h2></div><Wallet/></div><div className="portal-detail"><span>Total buy-ins</span><b>{money(wallet?.totalBuyIns)}</b><span>Total cash-outs</span><b>{money(wallet?.totalCashOuts)}</b><span>Net recorded activity</span><b>{money(wallet?.netRecordedPosition)}</b></div><p className="form-note">Operational records only; not a bank balance or withdrawable wallet.</p><button className="btn primary" onClick={()=>setTab('wallet')}>View wallet history</button></section>
        </div>
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">CLUB FLOOR</div><h2>Open tables</h2><p>Availability is informational; joining the waiting list is not a confirmed seat.</p></div></div><TableCards tables={tables}/><button className="btn subtle" onClick={()=>setTab('tables')}>Tables & waiting list</button></section>
      </>}
      {tab==='profile' && <div className="portal-bottom-grid">
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">PERSONAL INFORMATION</div><h2>Edit profile</h2></div><CircleUserRound/></div><form className="portal-form" onSubmit={saveProfile}><label>Full name<input value={profileForm.name} required maxLength={100} onChange={e=>setProfileForm({...profileForm,name:e.target.value})}/></label><label>Phone number<input type="tel" value={profileForm.phone} required maxLength={20} onChange={e=>setProfileForm({...profileForm,phone:e.target.value})}/></label><label>Date of birth<input type="date" value={profileForm.dateOfBirth} onChange={e=>setProfileForm({...profileForm,dateOfBirth:e.target.value})}/></label><label>Email (cannot be changed)<input value={profile?.email || user.email} disabled/></label><button className="btn primary" disabled={busy}>Save profile</button></form></section>
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">MEMBERSHIP</div><h2>Membership details</h2></div><Spade/></div><p><b>Player ID:</b> {profile?.playerId || 'Pending'}<br/><b>Membership ID:</b> {profile?.membershipId || 'Pending'}</p><p><b>Status:</b> <span className={`status-pill ${statusClass(profile?.membershipStatus)}`}>{profile?.membershipStatus || 'none'}</span></p>{memberships.length ? memberships.map(m=><div className="simple-row" key={m._id}><div><b>{m.plan?.name || 'Membership'}</b><small>{date(m.startDate)} — {date(m.expiryDate)}</small><small>Fee recorded: {money(m.feePaid)}</small></div><span className={`status-pill ${statusClass(m.status)}`}>{m.status}</span></div>) : <div className="empty-state"><p>No membership plan has been activated on your account yet. Membership activation is handled by club staff.</p></div>}</section>
      </div>}
      {tab==='kyc' && <div className="portal-bottom-grid"><section className="panel"><div className="panel-head"><div><div className="eyebrow">IDENTITY VERIFICATION</div><h2>Submit KYC document</h2><p>Accepted formats: PDF, JPG or PNG. Maximum 5 MB.</p></div><Upload/></div><form className="portal-form" onSubmit={submitKyc}><label>Document type<select value={documentType} onChange={e=>setDocumentType(e.target.value)}><option value="government_id">Government ID</option><option value="address_proof">Address proof</option><option value="photo">Photo</option><option value="other">Other</option></select></label><label>Choose document<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required onChange={e=>setKycDocument(e.target.files?.[0] || null)}/></label><p className="form-note">Documents are stored in private server storage; this portal does not provide a public document link.</p><button className="btn primary" disabled={busy}>{busy?'Uploading…':'Upload & submit for review'}</button></form></section>
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">YOUR SUBMISSIONS</div><h2>KYC status</h2></div><ShieldCheck/></div>{kycRecords.length ? kycRecords.map(k=><div className="simple-row" key={k._id}><div><b>{String(k.documentType).replaceAll('_',' ')}</b><small>Submitted {date(k.createdAt)}</small>{k.reviewNote && <small>Review note: {k.reviewNote}</small>}</div><span className={`status-pill ${statusClass(k.status)}`}>{k.status}</span></div>) : <div className="empty-state"><p>No KYC documents submitted yet.</p></div>}</section></div>}
      {tab==='wallet' && <>
        <div className="portal-metrics"><section className="panel portal-stat"><Wallet/><small>Total buy-ins</small><strong>{money(wallet?.totalBuyIns)}</strong></section><section className="panel portal-stat"><Coins/><small>Total cash-outs</small><strong>{money(wallet?.totalCashOuts)}</strong></section><section className="panel portal-stat"><History/><small>Approved chip credits</small><strong>{Number(wallet?.creditedChips || 0).toLocaleString('en-IN')}</strong></section></div>
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">SECURE CHECKOUT</div><h2>Purchase club chips</h2><p>Pay real money through Razorpay. ₹1 = 1 chip. Payment is verified by the backend; chips are credited only after owner approval. Only use this after your club's merchant account and chip model have been approved by Razorpay.</p></div><Coins/></div><form className="portal-request" onSubmit={purchase}><label className="field">Amount (INR)<input type="number" min="1" max="10000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter purchase amount"/><small>{amount && Number(amount)>0 ? `You will receive ${Number(amount).toLocaleString('en-IN')} chips after owner approval.` : '₹1 = 1 chip'}</small></label><button className="btn primary" disabled={busy || !kycApproved}>{busy?'Opening secure checkout…':'Pay with Razorpay'}</button></form></section>
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">REQUEST TRACKING</div><h2>Purchase history</h2></div></div>{purchaseRequests.length ? <div className="table-wrap"><table><thead><tr><th>Request ID</th><th>Amount</th><th>Payment</th><th>Gateway order</th><th>Status</th><th>Submitted</th><th>Note</th></tr></thead><tbody>{purchaseRequests.map(r=><tr key={r._id}><td>{r.requestRef}</td><td>{money(r.amount)}</td><td>{r.mode==='razorpay' ? (r.payment?.status || 'pending') : 'Demo only'}</td><td>{r.payment?.orderId || '—'}</td><td><span className={`status-pill ${statusClass(r.status)}`}>{r.status}</span></td><td>{date(r.createdAt)}</td><td>{r.reviewNote || r.note}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p>No purchase requests yet.</p></div>}</section>
        <section className="panel"><div className="panel-head"><div><div className="eyebrow">CASHIER RECORDS</div><h2>Transaction history</h2><p>These are recorded cashier transactions. Online purchase payments and approved chip credits are tracked separately above.</p></div></div>{transactions.length ? <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{transactions.map(tx=><tr key={tx._id}><td>{tx.transactionRef}</td><td>{tx.type.replaceAll('_',' ')}</td><td>{money(tx.amount)}</td><td>{tx.status}</td><td>{date(tx.createdAt)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p>No cashier transactions have been recorded yet.</p></div>}</section>
      </>}
      {tab==='tables' && <><section className="panel"><div className="panel-head"><div><div className="eyebrow">FLOOR AVAILABILITY</div><h2>Open tables</h2><p>Table availability is informational. Only staff can confirm your seating.</p></div></div><TableCards tables={tables}/></section><div className="portal-bottom-grid"><section className="panel"><div className="panel-head"><div><div className="eyebrow">REQUEST ACCESS</div><h2>Join waiting list</h2></div><CalendarClock/></div><form className="portal-request" onSubmit={requestSeat}><label className="field">Preferred game<select value={game} onChange={e=>setGame(e.target.value)}><option>Texas Hold&apos;em</option><option>Omaha</option><option>Other</option></select></label><button className="btn primary" disabled={busy || !kycApproved}>Join waiting list</button></form></section><section className="panel"><div className="panel-head"><div><div className="eyebrow">YOUR REQUESTS</div><h2>Waiting-list history</h2></div></div>{entries.length ? entries.map(en=><div className="simple-row" key={en._id}><div><b>{en.preferredGame}</b><small>{date(en.requestedAt)} {en.table?.tableNumber ? `· Table ${en.table.tableNumber}` : ''}</small>{en.seatNumber ? <small>Seat {en.seatNumber}</small> : null}</div><div className="portal-row-actions"><span className={`status-pill ${statusClass(en.status)}`}>{en.status}</span>{en.status==='waiting' && <button className="btn subtle small" disabled={busy} onClick={()=>cancelWaitlist(en._id)}>Cancel</button>}</div></div>) : <div className="empty-state"><p>No waiting-list requests yet.</p></div>}</section></div></>}
      {tab==='sessions' && <section className="panel"><div className="panel-head"><div><div className="eyebrow">YOUR PLAY HISTORY</div><h2>Game session history</h2><p>Only your own session records are shown. Amounts reflect recorded operational values.</p></div><History/></div>{sessions.length ? <div className="table-wrap"><table><thead><tr><th>Table</th><th>Game</th><th>Seat</th><th>Started</th><th>Ended</th><th>Buy-in</th><th>Final chip count</th><th>Status</th></tr></thead><tbody>{sessions.map(s=><tr key={s._id}><td>{s.table?.tableNumber || '—'}</td><td>{s.table?.gameType || '—'}</td><td>{s.seatNumber || '—'}</td><td>{date(s.startedAt)}</td><td>{date(s.endedAt)}</td><td>{money(s.initialBuyIn)}</td><td>{s.finalChipCount == null ? '—' : money(s.finalChipCount)}</td><td><span className={`status-pill ${statusClass(s.status)}`}>{s.status}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><p>No game sessions recorded for your account yet.</p></div>}</section>}
      </>}
    </main><footer className="app-footer portal-footer"><span>© {new Date().getFullYear()} THE ROYALS CLUB</span><span>PRIVATE CLUB OPERATIONS · BLACK & GOLD</span></footer>
  </div>;
}
function TableCards({ tables }) {
  return tables.length ? <div className="portal-table-grid">{tables.map(t=><article className="portal-table-card" key={t._id}><div><span className="status-dot"/><b>{t.tableNumber}</b><span className="status-pill green">Open</span></div><h3>{t.gameType}</h3><p>{t.availableSeats} seats available of {t.maxSeats}</p><small>Blinds: {t.smallBlind} / {t.bigBlind}</small></article>)}</div> : <div className="empty-state"><b>No open tables currently</b><p>Please check again later or submit a waiting-list request.</p></div>;
}