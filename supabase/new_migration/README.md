# SureSight Database Migration Guide

This guide explains how to deploy the new, normalized database schema for the SureSight application.

## Migration Overview

The new database schema provides several improvements:

- Normalized data structure with proper relationships
- Custom PostgreSQL types for data validation
- Enhanced security through Row Level Security (RLS) policies
- Database functions for common operations
- Triggers for automatic data maintenance
- Support for multiple properties per homeowner
- Enhanced report details and assessment areas
- Complete audit trail with activities table
- Direct messaging and notification systems
- Built-in support for AI image processing

## Prerequisites

1. Backup your current Supabase database
2. Ensure you have appropriate permissions to run SQL commands in Supabase

## Migration Procedure

### 1. Backup Current Database

```bash
# Use Supabase CLI to create a backup
supabase db dump -f suresight_backup.sql
```

### 2. Deploy Migration Files

Deploy the migration files in the following order:

1. `01_schema.sql` - Creates the new tables and data types
2. `02_rls_policies.sql` - Sets up Row Level Security policies
3. `03_functions.sql` - Creates database functions
4. `04_triggers.sql` - Sets up triggers
5. `05_data_migration.sql` - Migrates data from old tables to new schema

The files can be executed via:
- Supabase Dashboard SQL Editor
- Supabase CLI
- Direct API calls

### 3. Update TypeScript Types

Replace your current TypeScript database types with the new ones:

1. Review `database.new.types.ts`
2. Replace the contents of `types/supabase.ts` with the new types
3. Update any imports and usage in your application

### 4. Update API Calls

Update your application's API calls to use the new schema:

1. Replace direct table access with function calls where appropriate
2. Update queries to match the new schema structure
3. Use the `get_complete_user_profile` function for retrieving user profiles

### 5. Testing

Test the following functionality:
- User authentication and profile retrieval
- Report creation and management
- Image uploads and assessment creation
- Notifications and messaging
- Row-level security functioning as expected

## Rollback Plan

If you encounter any issues, you can restore from the backup:

```bash
# Restore from backup using Supabase CLI
supabase db restore -f suresight_backup.sql
```

## Key Functions in New Schema

| Function | Purpose |
|----------|---------|
| `create_user_profile` | Create a new user with role-specific profile |
| `get_complete_user_profile` | Get detailed user profile with role-specific data |
| `create_property` | Create a new property for a homeowner |
| `create_report` | Create a new damage report |
| `add_assessment_area` | Add damage assessment to a report |
| `submit_report` | Submit a report for review |
| `assign_contractor_to_report` | Assign a contractor to a report |

## Schema Relationship Diagram

```
users
  ↓
profiles ←→ properties ←→ reports ←→ assessment_areas ←→ images
  ↓                         ↓              ↓
[role-specific              ↓             comments
 profiles]                  ↓
                          activities
                            ↓
                          estimates ←→ estimate_items
                            ↓
                          notifications/messages
```