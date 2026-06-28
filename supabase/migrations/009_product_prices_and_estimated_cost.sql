-- Product price catalog for auto cost estimation
create table public.product_prices (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  unit           text not null check (unit in ('kg', 'piece')),
  price_per_unit numeric(10,2) not null,
  created_at     timestamptz default now()
);

alter table public.product_prices enable row level security;

create policy "product_prices_select_auth"
  on public.product_prices for select
  using (auth.uid() is not null);

-- Demo prices in KZT (approximate market rates for Bahandi Burger)
insert into public.product_prices (name, unit, price_per_unit) values
  ('Помидоры',          'kg',     500.00),
  ('Огурцы',           'kg',     400.00),
  ('Лук репчатый',     'kg',     200.00),
  ('Картофель',        'kg',     150.00),
  ('Котлета говяжья',  'piece',  300.00),
  ('Булочка',          'piece',  150.00),
  ('Соус',             'piece',   80.00),
  ('Сыр',              'kg',    2000.00),
  ('Курица (филе)',    'kg',    1200.00),
  ('Картофель фри',    'kg',     350.00);

-- Estimated monetary loss, nullable — null means "not costed" (free-text product or offline)
alter table public.writeoff_requests
  add column if not exists estimated_cost numeric(10,2);