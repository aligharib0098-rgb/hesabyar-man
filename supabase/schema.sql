-- حساب‌یار: اجرا در Supabase > SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  total_amount numeric(20,0) not null check (total_amount > 0),
  installment_amount numeric(20,0) not null default 0 check (installment_amount >= 0),
  paid_amount numeric(20,0) not null default 0 check (paid_amount >= 0 and paid_amount <= total_amount),
  due_date date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(20,0) not null check (amount > 0),
  date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  title text not null,
  amount numeric(20,0) not null check (amount > 0),
  category text not null default 'متفرقه',
  date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(20,0) not null check (target_amount > 0),
  saved_amount numeric(20,0) not null default 0 check (saved_amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;

-- حذف سیاست‌های قبلی هم‌نام برای امکان اجرای مجدد اسکریپت
drop policy if exists "own_debts" on public.debts;
drop policy if exists "own_payments" on public.debt_payments;
drop policy if exists "own_transactions" on public.transactions;
drop policy if exists "own_goals" on public.savings_goals;

create policy "own_debts" on public.debts for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_payments" on public.debt_payments for all to authenticated
using (auth.uid() = user_id and exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid()))
with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid()));
create policy "own_transactions" on public.transactions for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_goals" on public.savings_goals for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists debts_user_idx on public.debts(user_id);
create index if not exists payments_user_debt_idx on public.debt_payments(user_id,debt_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id,date desc);
create index if not exists goals_user_idx on public.savings_goals(user_id);
