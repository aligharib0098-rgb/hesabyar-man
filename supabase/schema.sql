
-- پرداخت‌های تکرارشونده؛ افزایشی و بدون حذف اطلاعات قبلی

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,

  kind text not null default 'expense'
    check (kind in ('income', 'expense')),

  title text not null,
  amount numeric(20,0) not null check (amount > 0),
  category text not null default 'متفرقه',
  notes text default '',

  recurrence_day integer not null default 1
    check (recurrence_day between 1 and 31),

  next_run_date date not null,
  start_date date not null default current_date,
  end_date date,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  check (end_date is null or end_date >= start_date)
);

-- ارتباط تراکنش ثبت‌شده با الگوی تکرارشونده
alter table public.transactions
  add column if not exists recurring_transaction_id uuid
  references public.recurring_transactions(id) on delete set null;

alter table public.transactions
  add column if not exists recurring_period date;

-- جلوگیری از ثبت دوباره یک پرداخت در یک دوره
create unique index if not exists
  transactions_recurring_period_unique
on public.transactions (
  user_id,
  recurring_transaction_id,
  recurring_period
)
where recurring_transaction_id is not null
  and recurring_period is not null;

-- امنیت اطلاعات کاربران
alter table public.recurring_transactions
  enable row level security;

drop policy if exists "own_recurring_transactions"
  on public.recurring_transactions;

create policy "own_recurring_transactions"
on public.recurring_transactions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ایندکس‌ها
create index if not exists recurring_user_next_date_idx
on public.recurring_transactions(user_id, next_run_date);

create index if not exists recurring_user_active_idx
on public.recurring_transactions(user_id, is_active);
