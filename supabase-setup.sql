-- Run this in your Supabase SQL Editor

create table links (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  destination_url text not null,
  click_count integer default 0,
  created_at timestamptz default now()
);

create table clicks (
  id uuid default gen_random_uuid() primary key,
  link_id uuid references links(id) on delete cascade,
  device text,
  outcome text,
  user_agent text,
  clicked_at timestamptz default now()
);

-- Allow public reads/writes (for the serverless functions)
alter table links enable row level security;
alter table clicks enable row level security;

create policy "Allow all" on links for all using (true) with check (true);
create policy "Allow all" on clicks for all using (true) with check (true);
