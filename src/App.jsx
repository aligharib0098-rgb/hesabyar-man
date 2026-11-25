
import React, { useEffect, useMemo, useState } from 'react';
import { supabase, configured } from './supabase';
import {
  Wallet, LayoutDashboard, CreditCard, ArrowLeftRight,
  PiggyBank, LogOut, Plus, Trash2, RefreshCw, TrendingUp,
  TrendingDown, CircleDollarSign, X, Cloud, ShieldCheck,
  Repeat, CalendarDays, PauseCircle, PlayCircle, CheckCircle2
} from 'lucide-react';

const BRAND = 'چرک کف دست من';
const SLOGAN = 'پول میاد و میره، علی غریب وسیله‌است';

const CATEGORIES = [
  'متفرقه',
  'خوراک و نوشیدنی',
  'فرهنگ و هنر',
  'کتاب و لوازم فرهنگی',
  'سینما و تئاتر',
  'کنسرت و موسیقی',
  'موزه و نمایشگاه',
  'خرید شخصی',
  'پوشاک و کفش',
  'بهداشت و مراقبت',
  'خانه و زندگی',
  'قبوض و خدمات',
  'حمل‌ونقل',
  'درمان و سلامت',
  'دارو و درمان',
  'آموزش و یادگیری',
  'کلاس‌های ورزشی و هنری',
  'تفریح و سفر',
  'بیمه تأمین اجتماعی',
  'اقساط و بدهی',
  'پس‌انداز و سرمایه‌گذاری',
  'حقوق و دستمزد',
  'درآمد پروژه',
  'هدیه و پاداش',
  'سایر'
];

const money = n =>
  new Intl.NumberFormat('fa-IR').format(Math.round(Number(n) || 0)) + ' تومان';

const dateFa = d =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fa-IR') : '—';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const nextMonthlyDate = (date, day) => {
  const [year, month] = date.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const y = nextMonth.getUTCFullYear();
  const m = nextMonth.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(Number(day), lastDay);
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
};

const emptyForm = {
  title: '',
  total_amount: '',
  installment_amount: '',
  due_date: '',
  notes: ''
};

const emptyRecurring = {
  title: '',
  amount: '',
  category: 'بیمه تأمین اجتماعی',
  recurrence_day: String(new Date().getDate()),
  next_run_date: today(),
  notes: ''
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('home');
  const [debts, setDebts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);

  const [modal, setModal] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);

  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [tx, setTx] = useState({
    kind: 'expense',
    title: '',
    amount: '',
    category: 'متفرقه',
    date: today(),
    notes: ''
  });

  const [goal, setGoal] = useState({
    title: '',
    target_amount: '',
    saved_amount: '0'
  });

  const [pay, setPay] = useState({
    amount: '',
    date: today(),
    notes: ''
  });

  const [recForm, setRecForm] = useState(emptyRecurring);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [session]);

  const msg = s => {
    setNotice(s);
    setTimeout(() => setNotice(''), 3500);
  };

  async function loadAll() {
    setLoading(true);

    const [d, t, g, r] = await Promise.all([
      supabase.from('debts').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
      supabase.from('recurring_transactions').select('*').order('next_run_date', { ascending: true })
    ]);

    if (d.error || t.error || g.error || r.error) {
      msg('خطا در دریافت اطلاعات؛ اتصال و دسترسی‌ها را بررسی کن.');
    }

    setDebts(d.data || []);
    setTransactions(t.data || []);
    setGoals(g.data || []);
    setRecurring(r.data || []);

    setLoading(false);
  }

  async function auth(e) {
    e.preventDefault();
    setBusy(true);

    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);

    if (result.error) msg(result.error.message);
    else if (authMode === 'signup' && !result.data.session) {
      msg('ثبت‌نام انجام شد؛ ایمیلت را برای تأیید بررسی کن.');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setDebts([]);
    setTransactions([]);
    setGoals([]);
    setRecurring([]);
  }

  const totals = useMemo(() => {
    const paid = debts.reduce((s, d) => s + Number(d.paid_amount || 0), 0);
    const remain = debts.reduce(
      (s, d) => s + Math.max(0, Number(d.total_amount) - Number(d.paid_amount || 0)),
      0
    );

    const month = today().slice(0, 7);

    const income = transactions
      .filter(x => x.kind === 'income' && x.date?.startsWith(month))
      .reduce((s, x) => s + Number(x.amount), 0);

    const expense = transactions
      .filter(x => x.kind === 'expense' && x.date?.startsWith(month))
      .reduce((s, x) => s + Number(x.amount), 0);

    return { paid, remain, income, expense };
  }, [debts, transactions]);

  async function addDebt(e) {
    e.preventDefault();
    setBusy(true);

    const total = Number(form.total_amount);
    const installment = Number(form.installment_amount || 0);

    const { error } = await supabase.from('debts').insert({
      title: form.title,
      total_amount: total,
      installment_amount: installment,
      due_date: form.due_date || null,
      notes: form.notes,
      paid_amount: 0
    });

    setBusy(false);

    if (error) msg(error.message);
    else {
      setModal('');
      setForm(emptyForm);
      msg('بدهی ثبت شد.');
      loadAll();
    }
  }

  async function addPayment(e) {
    e.preventDefault();

    if (!selected || Number(pay.amount) <= 0) return;

    const amount = Number(pay.amount);
    const next = Math.min(
      Number(selected.paid_amount) + amount,
      Number(selected.total_amount)
    );

    setBusy(true);

    const { error } = await supabase.from('debt_payments').insert({
      debt_id: selected.id,
      amount,
      date: pay.date,
      notes: pay.notes
    });

    if (!error) {
      const upd = await supabase
        .from('debts')
        .update({ paid_amount: next })
        .eq('id', selected.id);

      if (upd.error) msg(upd.error.message);
    }

    setBusy(false);

    if (error) msg(error.message);
    else {
      setModal('');
      setPay({ amount: '', date: today(), notes: '' });
      msg('پرداخت ثبت شد و مانده بدهی به‌روزرسانی شد.');
      loadAll();
    }
  }

  async function addTransaction(e) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.from('transactions').insert({
      ...tx,
      amount: Number(tx.amount)
    });

    setBusy(false);

    if (error) msg(error.message);
    else {
      setModal('');
      setTx({
        kind: 'expense',
        title: '',
        amount: '',
        category: 'متفرقه',
        date: today(),
        notes: ''
      });
      msg('تراکنش ثبت شد.');
      loadAll();
    }
  }

  async function addGoal(e) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.from('savings_goals').insert({
      ...goal,
      target_amount: Number(goal.target_amount),
      saved_amount: Number(goal.saved_amount)
    });

    setBusy(false);

    if (error) msg(error.message);
    else {
      setModal('');
      setGoal({ title: '', target_amount: '', saved_amount: '0' });
      msg('هدف پس‌انداز ثبت شد.');
      loadAll();
    }
  }

  async function addRecurring(e) {
    e.preventDefault();

    if (Number(recForm.amount) <= 0) {
      msg('مبلغ باید بیشتر از صفر باشد.');
      return;
    }

    setBusy(true);

    const { error } = await supabase.from('recurring_transactions').insert({
      kind: 'expense',
      title: recForm.title,
      amount: Number(recForm.amount),
      category: recForm.category,
      recurrence_day: Number(recForm.recurrence_day),
      next_run_date: recForm.next_run_date,
      start_date: recForm.next_run_date,
      notes: recForm.notes,
      is_active: true
    });

    setBusy(false);

    if (error) msg(error.message);
    else {
      setModal('');
      setRecForm(emptyRecurring);
      msg('هزینه تکرارشونده ثبت شد.');
      loadAll();
    }
  }

  async function recordRecurring(item) {
    if (busy) return;

    if (!item.is_active) {
      msg('این برنامه پرداخت غیرفعال است.');
      return;
    }

    if (item.next_run_date > today()) {
      msg('هنوز تاریخ سررسید این پرداخت نرسیده است.');
      return;
    }

    setBusy(true);

    const { error } = await supabase.from('transactions').insert({
      kind: item.kind,
      title: item.title,
      amount: Number(item.amount),
      category: item.category,
      date: item.next_run_date,
      notes: item.notes || 'پرداخت تکرارشونده ماهانه',
      recurring_transaction_id: item.id,
      recurring_period: item.next_run_date.slice(0, 7) + '-01'
    });

    if (error) {
      setBusy(false);

      if (error.code === '23505') {
        msg('این پرداخت برای این دوره قبلاً ثبت شده است.');
        loadAll();
      } else {
        msg(error.message);
      }
      return;
    }

    const nextDate = nextMonthlyDate(
      item.next_run_date,
      item.recurrence_day
    );

    const { error: updateError } = await supabase
      .from('recurring_transactions')
      .update({ next_run_date: nextDate })
      .eq('id', item.id);

    setBusy(false);

    if (updateError) {
      msg('تراکنش ثبت شد، اما به‌روزرسانی سررسید انجام نشد. صفحه را تازه‌سازی کن.');
    } else {
      msg('پرداخت ثبت شد و سررسید ماه بعد تنظیم شد.');
    }

    loadAll();
  }

  async function toggleRecurring(item) {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) msg(error.message);
    else {
      msg(item.is_active ? 'برنامه پرداخت متوقف شد.' : 'برنامه پرداخت فعال شد.');
      loadAll();
    }
  }

  async function deleteRow(table, id) {
    if (!confirm('از حذف این مورد مطمئنی؟')) return;

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) msg(error.message);
    else {
      msg('مورد حذف شد.');
      loadAll();
    }
  }

  const nav = [
    ['home', 'نمای کلی', LayoutDashboard],
    ['debts', 'اقساط و بدهی', CreditCard],
    ['transactions', 'دخل‌وخرج', ArrowLeftRight],
    ['recurring', 'پرداخت ماهانه', Repeat],
    ['goals', 'پس‌انداز', PiggyBank]
  ];

  if (!configured) return (
    <div className="setup">
      <div className="setup-card">
        <div className="logo"><Wallet /></div>
        <h1>{BRAND}</h1>
        <p>{SLOGAN}</p>
        <div className="setup-note">
          <Cloud />
          <div>
            <b>اتصال پایگاه داده هنوز تنظیم نشده</b>
            <span>برای فعال‌سازی همگام‌سازی، پروژه Supabase را بساز و مقادیر فایل .env را وارد کن.</span>
          </div>
        </div>
        <ol>
          <li>فایل <code>.env.example</code> را به <code>.env</code> تغییر نام بده.</li>
          <li>آدرس پروژه و کلید عمومی (anon/publishable) را در آن قرار بده.</li>
          <li>فایل <code>supabase/schema.sql</code> را در SQL Editor اجرا کن.</li>
          <li>دستورهای <code>npm install</code> و <code>npm run dev</code> را اجرا کن.</li>
        </ol>
        <p className="muted">کلید service_role یا رمز عبور حساب Supabase را در کد فرانت‌اند یا چت قرار نده.</p>
      </div>
    </div>
  );

  if (loading && !session) {
    return <div className="center">در حال آماده‌سازی {BRAND}…</div>;
  }

  if (!session) return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={auth}>
        <div className="logo"><Wallet /></div>
        <h1>{BRAND}</h1>
        <p>{SLOGAN}</p>
        <div className="tabs">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>ورود</button>
          <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>ثبت‌نام</button>
        </div>
        <label>ایمیل
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" />
        </label>
        <label>رمز عبور
          <input type="password" minLength="6" required value={password} onChange={e => setPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" dir="ltr" />
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? 'لطفاً صبر کن…' : authMode === 'login' ? 'ورود به حساب' : 'ساخت حساب'}
        </button>
        <small><ShieldCheck size={14} /> اطلاعات هر حساب فقط برای همان کاربر قابل مشاهده است.</small>
      </form>
    </div>
  );

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="brand-icon"><Wallet /></div>
          <div><b>{BRAND}</b><small>{SLOGAN}</small></div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={loadAll} title="همگام‌سازی"><RefreshCw size={18} /></button>
          <button className="icon-btn" onClick={signOut} title="خروج"><LogOut size={18} /></button>
        </div>
      </header>

      <main>
        <div className="welcome">
          <div>
            <span className="eyebrow">دفتر مالی شخصی علی غریب</span>
            <h1>پول میاد و میره؛ حسابش می‌مونه.</h1>
            <p>همه حساب‌وکتابت یک‌جا و همگام بین دستگاه‌ها.</p>
          </div>
          <span className="cloud-pill"><Cloud size={15} /> همگام‌سازی ابری</span>
        </div>

        <section className="stats">
          <Stat icon={CreditCard} label="بدهی باقی‌مانده" value={money(totals.remain)} tone="purple" />
          <Stat icon={CircleDollarSign} label="کل پرداخت‌شده" value={money(totals.paid)} tone="green" />
          <Stat icon={TrendingUp} label="درآمد این ماه" value={money(totals.income)} tone="blue" />
          <Stat icon={TrendingDown} label="هزینه این ماه" value={money(totals.expense)} tone="orange" />
        </section>

        <div className="content">
          <aside className="sidebar">
            {nav.map(([id, label, Icon]) => (
              <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}>
                <Icon size={19} />{label}
              </button>
            ))}
            <div className="side-tip">
              <ShieldCheck />
              <b>اطلاعات امن</b>
              <span>داده‌ها با حساب کاربری تو بین دستگاه‌ها همگام می‌شوند.</span>
            </div>
          </aside>

          <section className="panel">
            {tab === 'home' && <>
              <div className="section-head">
                <div><h2>نمای کلی</h2><p>خلاصه وضعیت مالی تو</p></div>
                <button className="primary" onClick={() => setModal('transaction')}><Plus size={17} /> ثبت تراکنش</button>
              </div>

              <div className="overview-grid">
                <div className="box">
                  <h3>وضعیت بدهی‌ها</h3>
                  {debts.length
                    ? debts.slice(0, 4).map(d => (
                      <DebtLine key={d.id} d={d} onPay={() => { setSelected(d); setModal('payment'); }} />
                    ))
                    : <Empty>هنوز بدهی‌ای ثبت نکردی.</Empty>}
                </div>

                <div className="box">
                  <h3>آخرین تراکنش‌ها</h3>
                  {transactions.slice(0, 5).length
                    ? transactions.slice(0, 5).map(t => <TransactionLine key={t.id} t={t} />)
                    : <Empty>هنوز تراکنشی ثبت نشده.</Empty>}
                </div>
              </div>

              <div className="box" style={{ marginTop: 18 }}>
                <h3><Repeat size={17} /> پرداخت‌های ماهانه نزدیک</h3>
                {recurring.filter(r => r.is_active).length
                  ? recurring.filter(r => r.is_active).slice(0, 4).map(r => (
                    <RecurringLine key={r.id} item={r} onPay={() => recordRecurring(r)} />
                  ))
                  : <Empty>هنوز پرداخت تکرارشونده‌ای ثبت نکردی.</Empty>}
              </div>
            </>}

            {tab === 'debts' && <>
              <div className="section-head">
                <div><h2>اقساط و بدهی</h2><p>پرداخت‌ها را ثبت کن تا مانده خودکار محاسبه شود.</p></div>
                <button className="primary" onClick={() => setModal('debt')}><Plus size={17} /> بدهی جدید</button>
              </div>

              {debts.length ? (
                <div className="debt-list">
                  {debts.map(d => (
                    <div className="debt-card" key={d.id}>
                      <div className="debt-top">
                        <div><b>{d.title}</b><small>سررسید: {dateFa(d.due_date)}</small></div>
                        <button className="danger-ghost" onClick={() => deleteRow('debts', d.id)}><Trash2 size={16} /></button>
                      </div>
                      <div className="debt-numbers">
                        <span>کل بدهی <b>{money(d.total_amount)}</b></span>
                        <span>پرداخت‌شده <b className="green">{money(d.paid_amount)}</b></span>
                        <span>باقی‌مانده <b>{money(Math.max(0, d.total_amount - d.paid_amount))}</b></span>
                      </div>
                      <div className="progress"><i style={{ width: `${Math.min(100, d.paid_amount / d.total_amount * 100)}%` }} /></div>
                      <div className="debt-bottom">
                        <small>{Math.round(d.paid_amount / d.total_amount * 100 || 0)}٪ تسویه شده</small>
                        <button className="secondary" onClick={() => { setSelected(d); setModal('payment'); }}>ثبت پرداخت قسط</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty>برای شروع، اولین بدهی یا وامت را ثبت کن.</Empty>}
            </>}

            {tab === 'transactions' && <>
              <div className="section-head">
                <div><h2>دخل‌وخرج</h2><p>درآمدها و هزینه‌های روزمره</p></div>
                <button className="primary" onClick={() => setModal('transaction')}><Plus size={17} /> ثبت تراکنش</button>
              </div>

              {transactions.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>عنوان</th><th>نوع</th><th>دسته‌بندی</th><th>تاریخ</th><th>مبلغ</th><th></th></tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td><span className={t.kind === 'income' ? 'tag-in' : 'tag-out'}>{t.kind === 'income' ? 'درآمد' : 'هزینه'}</span></td>
                          <td>{t.category}</td>
                          <td>{dateFa(t.date)}</td>
                          <td className={t.kind === 'income' ? 'green' : 'red'}>{money(t.amount)}</td>
                          <td><button className="danger-ghost" onClick={() => deleteRow('transactions', t.id)}><Trash2 size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>هنوز درآمد یا هزینه‌ای ثبت نکردی.</Empty>}
            </>}

            {tab === 'recurring' && <>
              <div className="section-head">
                <div>
                  <h2>پرداخت‌های تکرارشونده</h2>
                  <p>هزینه‌های ماهانه مثل بیمه و شهریه کلاس‌ها</p>
                </div>
                <button className="primary" onClick={() => setModal('recurring')}><Plus size={17} /> برنامه جدید</button>
              </div>

              <div className="box" style={{ marginBottom: 18 }}>
                <b>نکته</b>
                <p className="muted">در روز سررسید، پرداخت را از همین بخش ثبت کن. مبلغ به دخل‌وخرج اضافه می‌شود و سررسید ماه بعد به‌روزرسانی خواهد شد.</p>
              </div>

              {recurring.length ? (
                <div className="debt-list">
                  {recurring.map(r => (
                    <div className="debt-card" key={r.id}>
                      <div className="debt-top">
                        <div>
                          <b>{r.title}</b>
                          <small>{r.category} · روز {new Intl.NumberFormat('fa-IR').format(r.recurrence_day)} هر ماه</small>
                        </div>
                        <button className="danger-ghost" onClick={() => deleteRow('recurring_transactions', r.id)}><Trash2 size={16} /></button>
                      </div>

                      <div className="debt-numbers">
                        <span>مبلغ ماهانه <b>{money(r.amount)}</b></span>
                        <span>سررسید بعدی <b>{dateFa(r.next_run_date)}</b></span>
                        <span>وضعیت <b className={r.is_active ? 'green' : 'red'}>{r.is_active ? 'فعال' : 'متوقف'}</b></span>
                      </div>

                      <div className="debt-bottom">
                        <button className="secondary" disabled={!r.is_active || r.next_run_date > today() || busy} onClick={() => recordRecurring(r)}>
                          <CheckCircle2 size={15} /> ثبت پرداخت این دوره
                        </button>
                        <button className="secondary" onClick={() => toggleRecurring(r)}>
                          {r.is_active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                          {r.is_active ? 'توقف' : 'فعال‌سازی'}
                        </button>
                      </div>
                      {r.notes && <small className="muted">{r.notes}</small>}
                      {r.is_active && r.next_run_date > today() && (
                        <small className="muted">این پرداخت هنوز به سررسید نرسیده است.</small>
                      )}
                    </div>
                  ))}
                </div>
              ) : <Empty>هنوز برنامه پرداخت ماهانه‌ای نساختی. از «برنامه جدید» شروع کن.</Empty>}
            </>}

            {tab === 'goals' && <>
              <div className="section-head">
                <div><h2>هدف‌های پس‌انداز</h2><p>برای هدف‌های مالی‌ات برنامه‌ریزی کن.</p></div>
                <button className="primary" onClick={() => setModal('goal')}><Plus size={17} /> هدف جدید</button>
              </div>

              {goals.length ? (
                <div className="goal-grid">
                  {goals.map(g => (
                    <div className="goal-card" key={g.id}>
                      <div className="goal-icon"><PiggyBank /></div>
                      <b>{g.title}</b>
                      <div className="goal-values"><span>{money(g.saved_amount)} جمع‌شده</span><span>از {money(g.target_amount)}</span></div>
                      <div className="progress"><i style={{ width: `${Math.min(100, g.saved_amount / g.target_amount * 100)}%` }} /></div>
                      <small>{Math.round(g.saved_amount / g.target_amount * 100 || 0)}٪ از هدف</small>
                      <button className="danger-ghost" onClick={() => deleteRow('savings_goals', g.id)}><Trash2 size={15} /> حذف هدف</button>
                    </div>
                  ))}
                </div>
              ) : <Empty>هنوز هدف پس‌اندازی نساختی.</Empty>}
            </>}
          </section>
        </div>
      </main>

      <nav className="mobile-nav">
        {nav.map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {notice && <div className="toast">{notice}</div>}

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal('')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                {modal === 'debt' ? 'ثبت بدهی جدید'
                  : modal === 'payment' ? 'ثبت پرداخت قسط'
                  : modal === 'transaction' ? 'ثبت تراکنش'
                  : modal === 'goal' ? 'ساخت هدف پس‌انداز'
                  : 'ساخت پرداخت ماهانه'}
              </h3>
              <button className="icon-btn" onClick={() => setModal('')}><X /></button>
            </div>

            {modal === 'debt' && (
              <form onSubmit={addDebt}>
                <Field label="عنوان بدهی یا وام">
                  <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثلاً وام مسکن" />
                </Field>
                <div className="form-row">
                  <Field label="مبلغ کل (تومان)">
                    <input type="number" min="1" required value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
                  </Field>
                  <Field label="مبلغ هر قسط (تومان)">
                    <input type="number" min="0" value={form.installment_amount} onChange={e => setForm({ ...form, installment_amount: e.target.value })} />
                  </Field>
                </div>
                <Field label="تاریخ سررسید بعدی">
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </Field>
                <Field label="توضیحات">
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </Field>
                <button className="primary full" disabled={busy}>ثبت بدهی</button>
              </form>
            )}

            {modal === 'payment' && (
              <form onSubmit={addPayment}>
                <p className="muted">بدهی: <b>{selected?.title}</b> · مانده: <b>{money(Math.max(0, selected?.total_amount - selected?.paid_amount))}</b></p>
                <Field label="مبلغ پرداخت (تومان)">
                  <input type="number" min="1" max={Math.max(0, selected?.total_amount - selected?.paid_amount)} required value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
                </Field>
                <Field label="تاریخ پرداخت">
                  <input type="date" required value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
                </Field>
                <Field label="یادداشت">
                  <input value={pay.notes} onChange={e => setPay({ ...pay, notes: e.target.value })} />
                </Field>
                <button className="primary full" disabled={busy}>ثبت پرداخت</button>
              </form>
            )}

            {modal === 'transaction' && (
              <form onSubmit={addTransaction}>
                <div className="segmented">
                  <button type="button" className={tx.kind === 'expense' ? 'active' : ''} onClick={() => setTx({ ...tx, kind: 'expense' })}>هزینه</button>
                  <button type="button" className={tx.kind === 'income' ? 'active' : ''} onClick={() => setTx({ ...tx, kind: 'income' })}>درآمد</button>
                </div>
                <Field label="عنوان">
                  <input required value={tx.title} onChange={e => setTx({ ...tx, title: e.target.value })} placeholder="مثلاً خرید روزانه" />
                </Field>
                <div className="form-row">
                  <Field label="مبلغ (تومان)">
                    <input type="number" min="1" required value={tx.amount} onChange={e => setTx({ ...tx, amount: e.target.value })} />
                  </Field>
                  <Field label="دسته‌بندی">
                    <select value={tx.category} onChange={e => setTx({ ...tx, category: e.target.value })}>
                      {CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                    </Field>
                </div>
                <Field label="تاریخ">
                  <input type="date" required value={tx.date} onChange={e => setTx({ ...tx, date: e.target.value })} />
                </Field>
                <Field label="یادداشت">
                  <input value={tx.notes} onChange={e => setTx({ ...tx, notes: e.target.value })} />
                </Field>
                <button className="primary full" disabled={busy}>ذخیره تراکنش</button>
              </form>
            )}

            {modal === 'recurring' && (
              <form onSubmit={addRecurring}>
                <Field label="عنوان پرداخت">
                  <input required value={recForm.title} onChange={e => setRecForm({ ...recForm, title: e.target.value })} placeholder="مثلاً حق بیمه تأمین اجتماعی" />
                </Field>

                <Field label="مبلغ ماهانه (تومان)">
                  <input type="number" min="1" required value={recForm.amount} onChange={e => setRecForm({ ...recForm, amount: e.target.value })} placeholder="مبلغ به تومان" />
                </Field>

                <Field label="دسته‌بندی">
                  <select value={recForm.category} onChange={e => setRecForm({ ...recForm, category: e.target.value })}>
                    {CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </Field>

                <div className="form-row">
                  <Field label="روز پرداخت در ماه">
                    <input type="number" min="1" max="31" required value={recForm.recurrence_day} onChange={e => setRecForm({ ...recForm, recurrence_day: e.target.value })} />
                  </Field>
                  <Field label="اولین سررسید">
                    <input type="date" required value={recForm.next_run_date} onChange={e => setRecForm({ ...recForm, next_run_date: e.target.value })} />
                  </Field>
                </div>

                <Field label="توضیحات">
                  <textarea value={recForm.notes} onChange={e => setRecForm({ ...recForm, notes: e.target.value })} placeholder="اختیاری" />
                </Field>

                <button className="primary full" disabled={busy}>ذخیره برنامه ماهانه</button>
              </form>
            )}

            {modal === 'goal' && (
              <form onSubmit={addGoal}>
                <Field label="عنوان هدف">
                  <input required value={goal.title} onChange={e => setGoal({ ...goal, title: e.target.value })} placeholder="مثلاً سفر" />
                </Field>
                <div className="form-row">
                  <Field label="مبلغ هدف (تومان)">
                    <input type="number" min="1" required value={goal.target_amount} onChange={e => setGoal({ ...goal, target_amount: e.target.value })} />
                  </Field>
                  <Field label="پس‌انداز فعلی (تومان)">
                    <input type="number" min="0" value={goal.saved_amount} onChange={e => setGoal({ ...goal, saved_amount: e.target.value })} />
                  </Field>
                </div>
                <button className="primary full" disabled={busy}>ذخیره هدف</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="stat">
      <div className={'stat-icon ' + tone}><Icon size={19} /></div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="field">{label}{children}</label>;
}

function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

function DebtLine({ d, onPay }) {
  return (
    <div className="mini-line">
      <div><b>{d.title}</b><small>باقی‌مانده: {money(d.total_amount - d.paid_amount)}</small></div>
      <button className="text-btn" onClick={onPay}>پرداخت</button>
    </div>
  );
}

function TransactionLine({ t }) {
  return (
    <div className="mini-line">
      <div><b>{t.title}</b><small>{dateFa(t.date)} · {t.category}</small></div>
      <strong className={t.kind === 'income' ? 'green' : 'red'}>{t.kind === 'income' ? '+' : '−'}{money(t.amount)}</strong>
    </div>
  );
}

function RecurringLine({ item, onPay }) {
  return (
    <div className="mini-line">
      <div>
        <b>{item.title}</b>
        <small>سررسید: {dateFa(item.next_run_date)} · {money(item.amount)}</small>
      </div>
      {item.next_run_date <= today()
        ? <button className="text-btn" onClick={onPay}>ثبت پرداخت</button>
        : <small className="muted">در انتظار سررسید</small>}
    </div>
  );
}
