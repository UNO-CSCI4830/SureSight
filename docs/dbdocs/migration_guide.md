# SureSight Database Migration Guide - April 2025

## Overview

This document outlines the changes made to the SureSight database schema and application code in April 2025. The migration includes changes to the database schema, stored procedures, and corresponding TypeScript interfaces to better support role-based profiles and establish clearer relationships between entities.

## Key Changes

### Database Schema

1. **User Management**
   - Consolidated user and authentication data into a single `users` table
   - Added direct `role` field to users table (replacing the join table)
   - Created specialized profile tables for each user role (homeowner, contractor, adjuster)
   - Added verification fields for contractors and adjusters

2. **Property Management**
   - Enhanced properties table with additional metadata
   - Created direct relationship between homeowner profiles and properties
   - Added support for multiple properties per homeowner

3. **Report Structure**
   - Improved report status tracking with timestamps for each state
   - Added structured assessment areas for more detailed damage reports
   - Enhanced image metadata and AI processing capabilities
   - Added relationships between reports, properties, and users

4. **Security**
   - Implemented comprehensive Row Level Security (RLS) policies
   - Created role-specific access controls for all tables
   - Added audit trail capability with the activities table

### Database Functions

1. **User Profile Management**
   - `create_user_profile`: Creates a complete user with role-specific profile
   - `get_complete_user_profile`: Retrieves a user's complete data across all tables
   - `update_user_profile`: Updates user data across all relevant tables

2. **Property and Report Management**
   - `create_property`: Creates a property with validation
   - `create_report`: Creates a report with proper relationships
   - `add_assessment_area`: Adds a damage area to a report
   - `submit_report`: Updates report status and timestamps

## File Changes

### Updated Files

1. **Database Types**
   - `types/database.types.ts`: Updated to reflect new schema

2. **Authentication**
   - `components/auth/AuthGuard.tsx`: Updated role checking logic
   - `components/layout/Layout.tsx`: Updated user role fetching

3. **Profile Management**
   - `pages/profile.tsx`: Complete rewrite to support new profile structure
   - `pages/signup.tsx`: Updated to use new user creation functions

4. **Dashboard**
   - `pages/Dashboard.tsx`: Enhanced to work with new report structure

### Migration Files

Migration SQL files can be found in:
- `supabase/new_migration/01_schema.sql`: Schema definition
- `supabase/new_migration/02_rls_policies.sql`: Security policies
- `supabase/new_migration/03_functions.sql`: Database functions
- `supabase/new_migration/04_triggers.sql`: Database triggers
- `supabase/new_migration/05_data_migration.sql`: Data migration script

Old migration files have been moved to `supabase/deprecated_migrations/` for reference.

## Testing Changes

Tests have been updated to work with the new schema structure:
- `__tests__/components/auth/AuthGuard.test.tsx`: Updated mocks for new role structure

## How to Use the New Structure

### Fetching User Data

```typescript
// Get complete user profile with role-specific data
const { data, error } = await supabase.rpc('get_complete_user_profile', {
  p_user_id: userId
});

// Access user's role-specific data
const userData = data as CompleteUserProfile;
if (userData.user.role === 'homeowner') {
  const homeownerData = userData.roleProfile as HomeownerProfile;
  // Access homeowner-specific fields
}
```

### Creating Users

```typescript
// Create a new user with role-specific profile
const { data, error } = await supabase.rpc('create_user_profile', {
  p_email: 'user@example.com',
  p_first_name: 'John',
  p_last_name: 'Doe',
  p_role: 'contractor',
  p_auth_user_id: authUserId,
  p_company_name: 'Acme Repairs',
  p_license_number: 'CON-12345',
  // Additional role-specific fields as needed
});
```

### Creating Reports

```typescript
// Create a new property report
const { data: reportId, error } = await supabase.rpc('create_report', {
  p_property_id: propertyId,
  p_creator_id: userId,
  p_title: 'Roof Inspection Report',
  p_description: 'Post-hail storm inspection'
});

// Add assessment areas to the report
if (reportId) {
  await supabase.rpc('add_assessment_area', {
    p_report_id: reportId,
    p_damage_type: 'roof',
    p_location: 'North facing slope',
    p_severity: 'moderate',
    p_added_by: userId
  });
}
```

## Rollback Plan

If issues are encountered, the rollback process is:

1. Restore database from backup
2. Revert code changes using git
3. Check out the previous version of TypeScript definition files

## Known Issues

- The transition from the join-table role system to direct role field requires careful handling of legacy data
- Some legacy reports may need additional processing to fit the new assessment area model

## Future Improvements

- Additional database functions to simplify common operations
- Enhanced AI damage detection and classification
- Support for multiple image analysis models