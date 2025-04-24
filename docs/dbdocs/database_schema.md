# SureSight Database Schema - Updated April 2025

## Overview
SureSight uses a relational database structure to manage user data, properties, damage reports, assessments, and images.
This schema is implemented in Supabase using PostgreSQL with proper row-level security policies.

## Database Schema Diagram
```
[Users] 1---* [Properties]
   |             |
   |             |
   |             |
[Role-specific   |
 Profiles]       |
                 |
                 v
              [Reports] 1---* [Assessment Areas]
                 |                 |
                 |                 |
                 v                 v
              [Images]         [Damage Details]
```

## Enums

### user_role
- `homeowner` - Property owners seeking damage assessment
- `contractor` - Repair professionals providing services
- `adjuster` - Insurance adjusters reviewing claims
- `admin` - System administrators

### report_status
- `pending` - Initial report creation, awaiting assessment
- `in_progress` - Assessment being performed
- `completed` - Assessment finished
- `reviewed` - Report reviewed by adjuster
- `approved` - Claim approved
- `rejected` - Claim rejected

### damage_type
- `hail` - Hail damage
- `wind` - Wind damage
- `water` - Water damage
- `fire` - Fire damage
- `structural` - Structural damage
- `cosmetic` - Cosmetic damage only

### damage_severity
- `none` - No damage detected
- `minimal` - Minimal damage, likely below deductible
- `moderate` - Moderate damage requiring repair
- `severe` - Severe damage requiring replacement

### contact_method
- `email` - Contact via email
- `phone` - Contact via phone call
- `sms` - Contact via text message

## Tables

### users Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| email | VARCHAR(255) | User's email address |
| password_hash | VARCHAR(255) | Hashed password for user authentication |
| first_name | VARCHAR(255) | User's first name |
| last_name | VARCHAR(255) | User's last name |
| role | user_role | User's role in the system |
| phone | VARCHAR(50) | User's phone number |
| avatar_url | TEXT | URL to user's profile picture |
| created_at | TIMESTAMP | Timestamp when user account was created |
| updated_at | TIMESTAMP | Timestamp when user account was last updated |

### homeowner_profiles Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| user_id | UUID | Foreign key referencing the Users table |
| preferred_contact_method | contact_method | Preferred method of contact |
| additional_notes | TEXT | Additional notes about the homeowner |
| property_count | INTEGER | Number of properties owned by the homeowner |
| created_at | TIMESTAMP | Timestamp when profile was created |
| updated_at | TIMESTAMP | Timestamp when profile was last updated |

### contractor_profiles Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| user_id | UUID | Foreign key referencing the Users table |
| company_name | VARCHAR(255) | Name of the contractor's company |
| license_number | VARCHAR(255) | Contractor's license number |
| specialties | TEXT[] | Array of contractor's specialties |
| years_experience | INTEGER | Years of experience |
| service_area | TEXT | Geographic service area |
| insurance_verified | BOOLEAN | Whether insurance has been verified |
| rating | DECIMAL | Contractor rating (1-5 scale) |
| created_at | TIMESTAMP | Timestamp when profile was created |
| updated_at | TIMESTAMP | Timestamp when profile was last updated |

### adjuster_profiles Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| user_id | UUID | Foreign key referencing the Users table |
| company_name | VARCHAR(255) | Name of the insurance company |
| adjuster_license | VARCHAR(255) | License number of the adjuster |
| territories | TEXT[] | Array of territories where the adjuster operates |
| certification_verified | BOOLEAN | Whether certification has been verified |
| created_at | TIMESTAMP | Timestamp when profile was created |
| updated_at | TIMESTAMP | Timestamp when profile was last updated |

### properties Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| owner_id | UUID | Foreign key referencing the Users table |
| address_line1 | TEXT | Street address line 1 |
| address_line2 | TEXT | Street address line 2 (optional) |
| city | VARCHAR(255) | City name |
| state | VARCHAR(50) | State/province |
| postal_code | VARCHAR(20) | Postal/ZIP code |
| property_type | VARCHAR(50) | Type of property (e.g., residential, commercial) |
| year_built | INTEGER | Year the property was built |
| square_footage | INTEGER | Square footage of the property |
| created_at | TIMESTAMP | Timestamp when property was added |
| updated_at | TIMESTAMP | Timestamp when property was last updated |

### reports Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| property_id | UUID | Foreign key referencing the Properties table |
| created_by | UUID | Foreign key referencing the Users table (who created the report) |
| assigned_to | UUID | Foreign key referencing the Users table (who is assigned) |
| title | VARCHAR(255) | Report title |
| status | report_status | Status of the report |
| inspection_date | DATE | Date of property inspection |
| main_image_url | TEXT | URL to the main image for this report |
| created_at | TIMESTAMP | Timestamp when report was created |
| updated_at | TIMESTAMP | Timestamp when report was last updated |
| published_at | TIMESTAMP | Timestamp when report was published |

### assessment_areas Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| report_id | UUID | Foreign key referencing the Reports table |
| name | VARCHAR(255) | Name of the assessment area (e.g., "North Roof", "Front Siding") |
| type | VARCHAR(100) | Type of area (roof, siding, gutter, etc.) |
| damage_type | damage_type | Type of damage found |
| damage_severity | damage_severity | Severity of damage found |
| notes | TEXT | Assessment notes |
| created_at | TIMESTAMP | Timestamp when assessment area was created |
| updated_at | TIMESTAMP | Timestamp when assessment area was last updated |

### images Table
| Column Name | Data Type | Description | 
|-------------|-----------|-------------|
| id | UUID | Unique identifier (primary key) |
| assessment_area_id | UUID | Foreign key referencing the Assessment Areas table |
| report_id | UUID | Foreign key referencing the Reports table |
| storage_path | TEXT | Path where the image is stored |
| url | TEXT | Public URL to access the image |
| thumbnail_url | TEXT | URL to thumbnail version of image |
| ai_processed | BOOLEAN | Whether the image has been processed by AI |
| ai_damage_detected | BOOLEAN | Whether AI detected damage in the image |
| ai_confidence | DECIMAL | Confidence score of AI detection (0-1) |
| created_at | TIMESTAMP | Timestamp when image was uploaded |
| metadata | JSONB | Additional image metadata |

## Functions

The database includes several stored procedures to manage user profiles and data:

### create_user_profile
Creates a complete user profile including role-specific profile tables.

### get_complete_user_profile
Retrieves a user's complete profile including role-specific data in a single query.

### update_user_profile
Updates a user's profile data across all relevant tables based on their role.

## Row Level Security (RLS)

Row Level Security policies are implemented to ensure users can only access their own data:

- Users can only view and edit their own profile information
- Homeowners can only see properties they own
- Contractors can only see reports assigned to them
- Adjusters can only see reports within their territories
- Admin users have access to all data

## Triggers

Database triggers maintain referential integrity and handle cascading updates:

- When a user's role changes, appropriate role-specific profiles are created
- When a report status changes, timestamps are automatically updated
- When a report is deleted, all associated assessment areas and images are removed

