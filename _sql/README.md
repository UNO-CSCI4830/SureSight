# Supabase Database Management

This directory contains SQL scripts for managing the SureSight application's Supabase database. These scripts handle various aspects of the database including table creation, Row Level Security (RLS) policies, triggers, and functions.

## Table of Contents

- [Setup](#setup)
- [Supabase CLI](#supabase-cli)
  - [Installation](#installation)
  - [Authentication](#authentication)
  - [Common CLI Commands](#common-cli-commands)
  - [Local Development](#local-development)
  - [Migrations](#migrations)
- [Supabase Dashboard](#supabase-dashboard)
  - [SQL Editor](#sql-editor)
  - [Table Management](#table-management)
  - [Row Level Security](#row-level-security)
  - [Storage Management](#storage-management)
  - [Functions & Edge Functions](#functions--edge-functions)
- [Best Practices](#best-practices)
- [Common Tasks](#common-tasks)

## Setup

Before using these scripts, ensure you have:

1. A Supabase account and a project set up at [supabase.com](https://supabase.com)
2. Access credentials to your project (URL and API keys)
3. Supabase CLI installed (see below)

## Supabase CLI

The Supabase Command Line Interface (CLI) allows you to manage your Supabase projects from the terminal.

### Installation

You can install the Supabase CLI using npm:

```bash
npm install -g supabase
```

Or using other package managers:

```bash
# Homebrew (macOS)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Authentication

Before using the CLI, you need to log in:

```bash
supabase login
```

This will prompt you to enter your Supabase access token, which you can find in the Supabase dashboard under your account settings.

### Common CLI Commands

Here are some essential Supabase CLI commands:

#### Project Management

```bash
# List all your Supabase projects
supabase projects list

# Link your local project to a Supabase project
supabase link --project-ref YOUR_PROJECT_ID

# Get project status
supabase status
```

#### Database Operations

```bash
# Execute a SQL file against your database
supabase db execute -f path/to/file.sql

# Start a SQL console
supabase db studio

# Diff local schema against remote
supabase db diff
```

#### Schema Management

```bash
# Push local schema changes to remote
supabase db push

# Pull schema changes from remote
supabase db pull
```

### Local Development

Supabase CLI enables local development with:

```bash
# Start local Supabase instance
supabase start

# Stop local Supabase instance
supabase stop

# Reset local database
supabase db reset

# Get local connection string
supabase db remote commit
```

### Migrations

Managing database migrations:

```bash
# Create a new migration
supabase migration new name_of_migration

# Apply all pending migrations
supabase migration up

# List all migrations
supabase migration list
```

## Supabase Dashboard

The Supabase Dashboard provides a graphical interface for managing your database.

### SQL Editor

1. Log in to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to the "SQL Editor" section
4. Create a new query or select a saved one
5. Write or paste your SQL code
6. Click "Run" to execute

Tips:
- Save frequently used queries for reuse
- Use the "Templates" feature for common operations
- You can share queries with team members

### Table Management

Table operations in the dashboard:

1. Go to the "Table Editor" section
2. Create tables with the "New Table" button
3. Manage columns, foreign keys, and indexes
4. Use the "Insert Row" feature to add data manually

For bulk operations:
1. Use the "Import data" option to upload CSV files
2. Export data using the "Export" button on any table view

### Row Level Security

To manage Row Level Security (RLS) policies:

1. Go to "Authentication" → "Policies"
2. Select a table to view or modify its policies
3. Click "Add Policy" to create a new policy:
   - Choose policy type (Select, Insert, Update, Delete)
   - Define the policy expression (e.g., `auth.uid() = user_id`)
   - Name your policy descriptively

Example steps for adding RLS to a new table:
1. Create your table
2. Enable RLS on the table
3. Create policies to allow appropriate access

### Storage Management

For file storage management:

1. Go to the "Storage" section
2. Create buckets with the "New Bucket" button
3. Set public/private access for each bucket
4. Create RLS policies for storage following similar principles as database RLS

### Functions & Edge Functions

To manage serverless functions:

1. Go to the "Edge Functions" section
2. Create a new function with the "New Function" button
3. Write or upload your function code
4. Deploy the function
5. Access logs and monitoring information

## Best Practices

1. **Version control your SQL files:** Keep all database changes under version control
2. **Use migrations:** For schema changes to ensure replicability
3. **Test RLS policies:** Verify that your security rules work as expected
4. **Document schema changes:** Add comments to SQL scripts explaining their purpose
5. **Use transactions:** Wrap complex operations in transactions to ensure atomicity
6. **Backup regularly:** Use the dashboard's backup feature or automate backups
7. **Monitor performance:** Use the dashboard's database insights

## Common Tasks

Here are the solutions for some common tasks using the SQL files in this directory:

### View All RLS Policies

```bash
supabase db execute -f show_all_policies.sql
```

Or run the `show_all_policies.sql` script in the dashboard SQL Editor.

### Fix User Creation Issues

If you're having issues with user creation:

```bash
supabase db execute -f fix_user_creation.sql
```

### Create Tables

To create a new profiles table:

```bash
supabase db execute -f create_profiles_table.sql
```

### Setup Image Analysis

To configure image analysis functionality:

```bash
# Setup configuration
supabase db execute -f create_image_analysis_config.sql

# Create trigger
supabase db execute -f create_image_analysis_trigger.sql

# Test the trigger
supabase db execute -f test_image_analysis_trigger.sql
```

### Enable or Fix RLS

```bash
# Enable RLS
supabase db execute -f enable_rls.sql

# Fix RLS policies
supabase db execute -f fix_rls_policies.sql
```

For more specific operations, refer to the individual SQL files in this directory, which are named descriptively according to their function.