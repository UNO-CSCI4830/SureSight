-- SQL script to show all RLS policies in the database
-- This will display a complete list of all policies with relevant details

SELECT
    schemaname,
    tablename, 
    policyname,
    permissive,
    cmd,
    roles,
    qual AS "using_expression",
    with_check AS "with_check_expression"
FROM
    pg_policies
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    cmd;