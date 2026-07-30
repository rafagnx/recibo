-- ============================================================
-- 🔓 FIX RLS — Liberar acesso público para todas as tabelas
-- Cole isso no SQL Editor do Supabase e clique em RUN
-- ============================================================

-- Remove políticas antigas (se existirem) para evitar duplicatas
DROP POLICY IF EXISTS "Allow all on owners" ON public.owners;
DROP POLICY IF EXISTS "Allow all on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all on contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow all on receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow all on documents" ON public.documents;

-- Cria políticas que permitem tudo (o app tem seu próprio login)
CREATE POLICY "Allow all on owners" ON public.owners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on receipts" ON public.receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
