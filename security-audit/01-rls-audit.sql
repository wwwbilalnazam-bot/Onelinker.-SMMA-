-- ============================================================================
-- RLS AUDIT QUERY SUITE
-- Run these in Supabase SQL Editor to diagnose isolation issues
-- ============================================================================

-- 1. LIST ALL TABLES AND RLS STATUS
-- Shows which tables have RLS enabled and which don't (dangerous!)
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled,
    COALESCE(
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename),
        0
    ) AS policy_count
FROM pg_tables t
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'extensions')
ORDER BY schemaname, tablename;

-- 2. LIST ALL RLS POLICIES WITH DETAILS
-- Critical: Shows what each policy allows
SELECT
    n.nspname AS schema_name,
    t.tablename AS table_name,
    p.policyname AS policy_name,
    p.permissive,
    CASE p.cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS operation,
    pg_get_expr(p.qual, p.relid) AS using_clause,
    pg_get_expr(p.with_check, p.relid) AS with_check_clause
FROM pg_policies p
JOIN pg_tables t ON p.tablename = t.tablename
JOIN pg_namespace n ON t.schemaname = n.nspname
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema_name, table_name, operation;

-- 3. IDENTIFY DANGEROUS POLICIES (SECURITY RED FLAGS)
-- Highlights overly permissive policies
SELECT
    n.nspname AS schema_name,
    t.tablename AS table_name,
    p.policyname AS policy_name,
    CASE p.cmd
        WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL' END AS operation,
    pg_get_expr(p.qual, p.relid) AS using_clause,
    CASE
        WHEN pg_get_expr(p.qual, p.relid) IS NULL THEN '🚨 CRITICAL: No filter (true by default)'
        WHEN pg_get_expr(p.qual, p.relid)::text LIKE '%true%' THEN '⚠️ WARNING: true clause detected'
        WHEN pg_get_expr(p.qual, p.relid)::text LIKE '%auth.uid()%' AND
             pg_get_expr(p.qual, p.relid)::text NOT LIKE '%workspace%' THEN
            '⚠️ WARNING: auth.uid() only, missing workspace_id check'
        ELSE '✅ OK: Has conditional logic'
    END AS risk_level
FROM pg_policies p
JOIN pg_tables t ON p.tablename = t.tablename
JOIN pg_namespace n ON t.schemaname = n.nspname
WHERE n.nspname = 'public'
ORDER BY table_name, operation;

-- 4. CHECK FOR MISSING WITH CHECK ON WRITES
-- INSERT/UPDATE without WITH CHECK can allow privilege escalation
SELECT
    n.nspname AS schema_name,
    t.tablename AS table_name,
    p.policyname AS policy_name,
    CASE p.cmd
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
    END AS operation,
    CASE
        WHEN p.with_check IS NULL THEN '🚨 CRITICAL: No WITH CHECK clause'
        ELSE '✅ WITH CHECK present'
    END AS security_status
FROM pg_policies p
JOIN pg_tables t ON p.tablename = t.tablename
JOIN pg_namespace n ON t.schemaname = n.nspname
WHERE n.nspname = 'public'
    AND p.cmd IN ('a', 'w')  -- INSERT, UPDATE
ORDER BY table_name, operation;

-- 5. IDENTIFY TABLES WITHOUT RLS ENABLED
-- These tables are COMPLETELY EXPOSED
SELECT
    schemaname,
    tablename,
    CASE
        WHEN schemaname = 'public' THEN '🚨 CRITICAL: Public table, no RLS'
        ELSE '⚠️ WARNING: RLS disabled'
    END AS risk
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    AND tablename NOT IN (
        SELECT tablename FROM pg_tables t
        WHERE EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = t.schemaname
              AND table_name = t.tablename
              AND row_security_active = true
        )
    )
ORDER BY schemaname, tablename;

-- 6. VERIFY AUTH CONTEXT (Check if JWT is properly configured)
-- Run this to see what claims are available in auth.jwt()
SELECT
    'JWT Claims' as info,
    auth.jwt() as full_jwt,
    auth.jwt()->>'sub' as user_id,
    auth.jwt()->>'email' as email,
    auth.jwt()->>'workspace_id' as workspace_id  -- Your custom claim
FROM (VALUES (1)) -- Dummy row
LIMIT 1;

-- 7. LIST COLUMNS THAT SHOULD BE WORKSPACE-SCOPED
-- Find workspace_id columns that might not be indexed or used in policies
SELECT
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.statistics
            WHERE table_schema = t.table_schema
              AND table_name = t.table_name
              AND column_name = c.column_name
        ) THEN '✅ Indexed'
        ELSE '⚠️ Not indexed'
    END AS index_status
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_schema = c.table_schema
    AND t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND c.column_name IN ('workspace_id', 'tenant_id', 'org_id')
ORDER BY table_name, column_name;

-- 8. SECURITY: Check for hardcoded secrets or auth issues in function/trigger code
-- View any SQL functions that might bypass RLS
SELECT
    routine_schema,
    routine_name,
    routine_type,
    CASE
        WHEN routine_definition LIKE '%SECURITY DEFINER%' THEN '⚠️ DEFINER: Runs as owner, bypasses RLS'
        WHEN routine_definition LIKE '%SECURITY INVOKER%' THEN '✅ INVOKER: Respects RLS'
        ELSE '⚠️ Unknown security context'
    END AS security_context
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type IN ('FUNCTION', 'PROCEDURE')
ORDER BY routine_name;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 🚨 CRITICAL: Stop using that table immediately, implement RLS
-- ⚠️ WARNING: Review and likely need to fix the policy
-- ✅ OK: This configuration appears secure
