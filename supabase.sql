create table if not exists products (
  id text primary key,
  code text unique not null,
  name text not null,
  unit text default 'cái',
  price numeric default 0,
  stock numeric default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists customers (
  id text primary key,
  name text,
  phone text,
  address text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists orders (
  id text primary key,
  status text not null check (status in ('sold', 'draft')),
  customer jsonb default '{}'::jsonb,
  items jsonb default '[]'::jsonb,
  discount numeric default 0,
  shipping_fee numeric default 0,
  paid numeric default 0,
  total numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;

drop policy if exists "public read products" on products;
drop policy if exists "public write products" on products;
drop policy if exists "public read customers" on customers;
drop policy if exists "public write customers" on customers;
drop policy if exists "public read orders" on orders;
drop policy if exists "public write orders" on orders;

create policy "public read products" on products for select using (true);
create policy "public write products" on products for all using (true) with check (true);

create policy "public read customers" on customers for select using (true);
create policy "public write customers" on customers for all using (true) with check (true);

create policy "public read orders" on orders for select using (true);
create policy "public write orders" on orders for all using (true) with check (true);

insert into products (id, code, name, unit, price, stock)
values
('VHL-LED-001','VHL-LED-001','Đèn LED âm trần 9W','cái',95000,100),
('VHL-LED-002','VHL-LED-002','Đèn LED panel 18W','cái',185000,80),
('VHL-DAY-001','VHL-DAY-001','Dây LED 12V','mét',42000,300)
on conflict (id) do nothing;
alter table products add column if not exists group_code text;

create table if not exists product_groups (
  id text primary key,
  code text unique not null,
  name text not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table product_groups enable row level security;

drop policy if exists "public read product groups" on product_groups;
drop policy if exists "public write product groups" on product_groups;

create policy "public read product groups" on product_groups for select using (true);
create policy "public write product groups" on product_groups for all using (true) with check (true);

insert into product_groups (id, code, name, note)
values
('rncc','rncc','RNCC','Nhóm ray nam châm / phụ kiện liên quan'),
('tan-quang','tan-quang','Tán quang','Nhóm sản phẩm tán quang'),
('thanh-ray-nam-cham','thanh-ray-nam-cham','Thanh ray nam châm','Nhóm thanh ray nam châm')
on conflict (id) do nothing;
