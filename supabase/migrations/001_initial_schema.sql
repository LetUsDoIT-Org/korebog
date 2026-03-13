-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Vehicles
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  registration_number text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
create policy "Users manage own vehicles"
  on vehicles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Odometer readings
create table odometer_readings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  reading_km integer not null,
  date date not null default current_date,
  note text,
  created_at timestamptz default now()
);

alter table odometer_readings enable row level security;
create policy "Users manage own odometer readings"
  on odometer_readings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trips
create table trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  date date not null default current_date,
  purpose text not null,
  start_address text not null,
  end_address text not null,
  distance_km numeric(10,2) not null,
  is_business boolean default true,
  transport_type text default 'car' check (transport_type in ('car', 'public_transport')),
  gps_track jsonb,
  created_at timestamptz default now()
);

alter table trips enable row level security;
create policy "Users manage own trips"
  on trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Favorite trips
create table favorite_trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  purpose text not null,
  start_address text not null,
  end_address text not null,
  distance_km numeric(10,2) not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table favorite_trips enable row level security;
create policy "Users manage own favorite trips"
  on favorite_trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User profiles
create table user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null default '',
  address text not null default '',
  identifier text not null default '',
  identifier_type text default 'cpr' check (identifier_type in ('cpr', 'employee_number')),
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;
create policy "Users manage own profile"
  on user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index idx_trips_user_date on trips(user_id, date desc);
create index idx_trips_vehicle on trips(vehicle_id);
create index idx_odometer_vehicle_date on odometer_readings(vehicle_id, date desc);
create index idx_favorite_trips_user_sort on favorite_trips(user_id, sort_order);
