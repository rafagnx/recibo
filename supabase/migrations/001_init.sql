-- ============================================================
-- 🗄️ Recibo App — Supabase Migration v1.0.0
-- Tables: owners, tenants, contracts, receipts, documents
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==================== OWNER ====================
create table if not exists public.owners (
  id uuid primary key default uuid_generate_v4(),
  name text not null default '',
  cpf text not null default '',
  beneficiary text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default owner row (singleton)
insert into public.owners (name, cpf, beneficiary)
values ('', '', '')
on conflict do nothing;

-- ==================== TENANTS ====================
create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cpf text not null default '',
  telefone text not null default '',
  email text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== CONTRACTS ====================
create table if not exists public.contracts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  imovel_endereco text not null,
  valor_aluguel numeric(10,2) not null default 0,
  valor_condominio numeric(10,2) not null default 0,
  valor_iptu numeric(10,2) not null default 0,
  valor_garagem numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null default 0,
  dia_vencimento integer not null default 5,
  data_inicio date,
  data_fim date,
  status text not null default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== RECEIPTS ====================
create table if not exists public.receipts (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  numero integer not null,
  year integer not null,
  month integer not null,
  competencia text not null,
  valor_aluguel numeric(10,2) not null default 0,
  valor_condominio numeric(10,2) not null default 0,
  valor_iptu numeric(10,2) not null default 0,
  valor_garagem numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null default 0,
  vencimento date,
  status text not null default 'pendente',
  data_emissao date default current_date,
  data_pagamento date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== DOCUMENTS ====================
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  type text not null default '',
  size integer not null default 0,
  data text, -- Base64 encoded
  uploaded_at timestamptz default now()
);

-- ==================== INDEXES ====================
create index if not exists idx_contracts_tenant_id on public.contracts(tenant_id);
create index if not exists idx_receipts_contract_id on public.receipts(contract_id);
create index if not exists idx_receipts_tenant_id on public.receipts(tenant_id);
create index if not exists idx_documents_tenant_id on public.documents(tenant_id);

-- ==================== RLS (Row Level Security) ====================
alter table public.owners enable row level security;
alter table public.tenants enable row level security;
alter table public.contracts enable row level security;
alter table public.receipts enable row level security;
alter table public.documents enable row level security;

-- Allow public access (the app has its own auth via optional password)
create policy "Allow all on owners" on public.owners for all using (true) with check (true);
create policy "Allow all on tenants" on public.tenants for all using (true) with check (true);
create policy "Allow all on contracts" on public.contracts for all using (true) with check (true);
create policy "Allow all on receipts" on public.receipts for all using (true) with check (true);
create policy "Allow all on documents" on public.documents for all using (true) with check (true);
