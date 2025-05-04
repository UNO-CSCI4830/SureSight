-- SQL query to get the current database structure after migrations
-- This will help update the database_routes.txt file

-- Get all tables in the public schema
WITH table_info AS (
  SELECT 
    t.table_name,
    obj_description(pgc.oid) AS table_description
  FROM 
    information_schema.tables t
    JOIN pg_class pgc ON t.table_name = pgc.relname
    JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = t.table_schema
  WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('schema_migrations')
  ORDER BY 
    t.table_name
),

-- Get all columns for each table
column_info AS (
  SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    col_description((t.table_schema || '.' || t.table_name)::regclass::oid, c.ordinal_position) AS column_description,
    (SELECT pg_get_constraintdef(con.oid)
     FROM pg_constraint con
     JOIN pg_namespace nsp ON nsp.oid = con.connamespace
     WHERE con.contype = 'c' 
       AND con.conrelid = (t.table_schema || '.' || t.table_name)::regclass::oid 
       AND con.conkey[1] = c.ordinal_position) AS check_constraint
  FROM 
    information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
  WHERE 
    c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY 
    c.table_name, 
    c.ordinal_position
),

-- Get primary keys
primary_keys AS (
  SELECT 
    tc.table_name,
    string_agg(kc.column_name, ', ' ORDER BY kc.ordinal_position) AS primary_key_columns
  FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kc ON kc.constraint_name = tc.constraint_name AND kc.table_schema = tc.table_schema
  WHERE 
    tc.table_schema = 'public'
    AND tc.constraint_type = 'PRIMARY KEY'
  GROUP BY 
    tc.table_name
),

-- Get foreign keys
foreign_keys AS (
  SELECT 
    kcu.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
  FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
  WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
),

-- Get indexes
indexes AS (
  SELECT 
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS index_definition
  FROM 
    pg_indexes
  WHERE 
    schemaname = 'public'
),

-- Get policies (row-level security)
policies AS (
  SELECT 
    p.tablename AS table_name,
    p.policyname AS policy_name,
    p.cmd AS operation,
    p.qual AS using_expression,
    p.with_check
  FROM 
    pg_policies p
  WHERE 
    p.schemaname = 'public'
),

-- Get functions
functions AS (
  SELECT 
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_function_arguments(p.oid) AS argument_list,
    l.lanname AS language,
    obj_description(p.oid) AS function_description
  FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
  WHERE 
    n.nspname = 'public'
    AND p.prokind = 'f' -- only regular functions
  ORDER BY 
    p.proname
),

-- Get types/enums
custom_types AS (
  SELECT 
    t.typname AS type_name,
    (CASE WHEN t.typtype = 'e' THEN 'ENUM' ELSE t.typtype::text END) AS type_category,
    CASE 
      WHEN t.typtype = 'e' THEN
        (SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
         FROM pg_enum e
         WHERE e.enumtypid = t.oid)
      ELSE ''
    END AS enum_values,
    obj_description(t.oid) AS type_description
  FROM 
    pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE 
    n.nspname = 'public'
    AND (t.typtype = 'e' OR t.typtype = 'c' OR t.typtype = 'd')
)

-- Main query to output all information
SELECT 
  'TABLES' AS information_type,
  json_build_object(
    'table_name', ti.table_name,
    'description', ti.table_description,
    'primary_key', pk.primary_key_columns,
    'columns', json_agg(
      json_build_object(
        'name', ci.column_name,
        'type', ci.data_type,
        'nullable', ci.is_nullable,
        'default', ci.column_default,
        'description', ci.column_description,
        'check_constraint', ci.check_constraint
      ) ORDER BY ci.column_name
    )
  ) AS information
FROM 
  table_info ti
  JOIN column_info ci ON ti.table_name = ci.table_name
  LEFT JOIN primary_keys pk ON ti.table_name = pk.table_name
GROUP BY 
  ti.table_name, ti.table_description, pk.primary_key_columns

UNION ALL

SELECT
  'FOREIGN_KEYS' AS information_type,
  json_agg(
    json_build_object(
      'table_name', fk.table_name,
      'column_name', fk.column_name,
      'references', json_build_object(
        'table', fk.foreign_table_name,
        'column', fk.foreign_column_name,
        'on_delete', fk.delete_rule
      )
    )
  ) AS information
FROM 
  foreign_keys fk

UNION ALL

SELECT
  'INDEXES' AS information_type,
  json_agg(
    json_build_object(
      'table_name', idx.table_name,
      'index_name', idx.index_name,
      'definition', idx.index_definition
    )
  ) AS information
FROM 
  indexes idx

UNION ALL

SELECT
  'POLICIES' AS information_type,
  json_agg(
    json_build_object(
      'table_name', pol.table_name,
      'policy_name', pol.policy_name,
      'operation', pol.operation,
      'using_expression', pol.using_expression,
      'with_check', pol.with_check
    )
  ) AS information
FROM 
  policies pol

UNION ALL

SELECT
  'FUNCTIONS' AS information_type,
  json_agg(
    json_build_object(
      'function_name', func.function_name,
      'return_type', func.return_type,
      'arguments', func.argument_list,
      'language', func.language,
      'description', func.function_description
    )
  ) AS information
FROM 
  functions func

UNION ALL

SELECT
  'CUSTOM_TYPES' AS information_type,
  json_agg(
    json_build_object(
      'type_name', ct.type_name,
      'category', ct.type_category,
      'values', ct.enum_values,
      'description', ct.type_description
    )
  ) AS information
FROM 
  custom_types ct;