-- manabutiken Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_referral_code text;
begin
  -- Resolve referrer_id from referral_code in metadata
  if new.raw_user_meta_data ? 'referral_code' then
    select id into v_referrer_id
    from public.profiles
    where referral_code = new.raw_user_meta_data ->> 'referral_code'
    limit 1;
  end if;

  -- Generate a random referral code for the new user
  v_referral_code := upper(substring(md5(random()::text) from 1 for 8));

  insert into public.profiles (id, email, full_name, referrer_id, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_referrer_id,
    v_referral_code
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text default '',
  phone text default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  referrer_id uuid references public.profiles(id) on delete set null,
  referral_code text unique default null
);

-- Ensure columns exist if the table was already created
alter table public.profiles add column if not exists referrer_id uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists referral_code text unique default null;

-- Backfill referral codes for existing users who don't have one
update public.profiles
set referral_code = upper(substring(md5(random()::text) from 1 for 8))
where referral_code is null;

create unique index if not exists profiles_referral_code_upper_idx
  on public.profiles ((upper(trim(referral_code))));

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',
  first_name text not null,
  last_name text not null,
  street_1 text not null,
  street_2 text default '',
  postal_code text not null,
  city text not null,
  country text not null default 'SE',
  phone text default '',
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text default '',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists invite_codes_code_upper_idx
  on public.invite_codes ((upper(trim(code))));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text default '',
  image_url text default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'eur',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'eur',
  stripe_checkout_session_id text unique,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  flavor_slug text not null,
  flavor_name text not null,
  rating numeric(2,1) not null check (rating between 0 and 5 and mod(rating * 10, 5) = 0),
  comment text not null check (char_length(comment) between 1 and 150),
  approved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.reviews
  add column if not exists display_name text not null default '';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.check_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(coalesce(p_code, '')));
  is_valid boolean;
begin
  -- Exclusively check profiles table for referral_code (as per user request to only accept referral_codes)
  select exists (
    select 1
    from public.profiles
    where upper(trim(referral_code)) = normalized_code
  )
  into is_valid;

  return is_valid;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_addresses_updated_at on public.addresses;
create trigger set_addresses_updated_at
  before update on public.addresses
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_invite_codes_updated_at on public.invite_codes;
create trigger set_invite_codes_updated_at
  before update on public.invite_codes
  for each row execute procedure public.set_updated_at();

create or replace function public.process_order_commissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_referrer_id uuid;
  v_commission_amount integer;
  v_level integer := 1;
begin
  -- Only process if the order status changed to 'paid'
  -- We use (old.status is distinct from 'paid' and new.status = 'paid') to handle nulls and initial inserts
  if (new.status = 'paid' and (old.status is null or old.status != 'paid')) then
    v_current_user_id := new.user_id;

    -- Level 1: Initial commission is 10% of the subtotal (subtotal_cents)
    -- As per example: E buys for 1000 SEK, D (referrer) earns 100 SEK.
    -- v_commission_amount is 10% of subtotal_cents.
    v_commission_amount := floor(new.subtotal_cents * 0.1);

    -- Loop until the commission is less than 100 cents (1 SEK) or no more referrers
    while v_commission_amount >= 100 loop
      -- Find the referrer of the current user
      select referrer_id into v_referrer_id
      from public.profiles
      where id = v_current_user_id
      limit 1;

      -- If no referrer, we stop the line
      if v_referrer_id is null then
        exit;
      end if;

      -- Insert the commission record
      insert into public.commissions (user_id, order_id, amount_cents, status, level)
      values (v_referrer_id, new.id, v_commission_amount, 'available', v_level);

      -- Next level: 10% of the current commission
      v_commission_amount := floor(v_commission_amount * 0.1);
      v_current_user_id := v_referrer_id;
      v_level := v_level + 1;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists on_order_paid_distribute_commissions on public.orders;
create trigger on_order_paid_distribute_commissions
  after insert or update on public.orders
  for each row execute procedure public.process_order_commissions();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.set_updated_at();

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'available' check (status in ('available', 'used')),
  level integer not null check (level >= 1),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.commissions enable row level security;

drop policy if exists "Commissions are viewable by owner" on public.commissions;
create policy "Commissions are viewable by owner"
  on public.commissions
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.get_total_available_commission(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total_available integer;
begin
  select coalesce(sum(amount_cents), 0)
  into total_available
  from public.commissions
  where user_id = p_user_id
    and status = 'available';

  return total_available;
end;
$$;

create or replace function public.get_referred_users(p_user_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  order_count bigint,
  total_spent_cents bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.created_at,
    count(o.id) as order_count,
    coalesce(sum(o.total_cents), 0)::bigint as total_spent_cents
  from public.profiles p
  left join public.orders o
    on o.user_id = p.id
  where p.referrer_id = p_user_id
  group by p.id, p.full_name, p.email, p.created_at
  order by p.created_at desc;
$$;

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.invite_codes enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Addresses are viewable by owner" on public.addresses;
create policy "Addresses are viewable by owner"
  on public.addresses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Addresses are insertable by owner" on public.addresses;
create policy "Addresses are insertable by owner"
  on public.addresses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Addresses are updatable by owner" on public.addresses;
create policy "Addresses are updatable by owner"
  on public.addresses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Addresses are deletable by owner" on public.addresses;
create policy "Addresses are deletable by owner"
  on public.addresses
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Products are viewable by everyone" on public.products;
create policy "Products are viewable by everyone"
  on public.products
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Orders are viewable by owner" on public.orders;
create policy "Orders are viewable by owner"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Orders are insertable by owner" on public.orders;
create policy "Orders are insertable by owner"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Orders are updatable by owner" on public.orders;
create policy "Orders are updatable by owner"
  on public.orders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Order items are viewable by order owner" on public.order_items;
create policy "Order items are viewable by order owner"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where public.orders.id = order_items.order_id
        and public.orders.user_id = auth.uid()
    )
  );

drop policy if exists "Order items are insertable by order owner" on public.order_items;
create policy "Order items are insertable by order owner"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders
      where public.orders.id = order_items.order_id
        and public.orders.user_id = auth.uid()
    )
  );

drop policy if exists "Approved reviews are viewable by everyone" on public.reviews;
create policy "Approved reviews are viewable by everyone"
  on public.reviews
  for select
  to anon, authenticated
  using (approved = true or auth.uid() = user_id);

drop policy if exists "Reviews are insertable by owner" on public.reviews;
create policy "Reviews are insertable by owner"
  on public.reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Reviews are updatable by owner" on public.reviews;
create policy "Reviews are updatable by owner"
  on public.reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed products
insert into public.products (slug, name, description, price_cents, stock_quantity, active)
values
  ('ultra-instinct', 'Ultra Instinct', 'Peach ice tea / clean focus', 28900, 14, true),
  ('loot-devil-fruit-dose', 'Devil Fruit', 'Multivitamin / anime drop', 28900, 11, true),
  ('limited-black-loot-edition', 'Black LOOT Edition', 'Blackberry / blackcurrant dark', 28900, 0, true),
  ('rare-raspberry', 'Rare Raspberry', 'Raspberry / sweet-sour', 28900, 9, true),
  ('cactus-calamity', 'Cactus Calamity', 'Cactus lime / sharp fresh', 28900, 7, true),
  ('loot-sour-shock-dose', 'Sour Shock', 'Sour candy / electric hit', 28900, 0, true),
  ('loot-tiki-tropicali-dose', 'Tiki Tropicali', 'Tropical mix / beach energy', 28900, 12, true),
  ('loot-kimetsu-no-kiba-dose', 'Kimetsu No Kiba', 'Limited anime / collector front', 28900, 0, true),
  ('loot-phoenix-flames-dose', 'Phoenix Flames', 'Fiery fruit / red-orange heat', 28900, 6, true),
  ('invincible-ice-tea', 'Invincible Ice Tea', 'Ice tea / smooth chill', 28900, 8, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  stock_quantity = excluded.stock_quantity,
  active = excluded.active;
