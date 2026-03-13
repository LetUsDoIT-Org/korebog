-- Customers
create table customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text not null default '',
  created_at timestamptz default now()
);

alter table customers enable row level security;
create policy "Users manage own customers"
  on customers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_customers_user on customers(user_id);

-- Add customer_id to trips
alter table trips add column customer_id uuid references customers(id) on delete set null;
create index idx_trips_customer on trips(customer_id);

-- Add customer_id to favorite_trips
alter table favorite_trips add column customer_id uuid references customers(id) on delete set null;
