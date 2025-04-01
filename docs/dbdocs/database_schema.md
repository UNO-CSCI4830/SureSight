# SureSight Database Schema
## Overview
SureSight will use a relational database structure to manage user data, damage reports, assessments, and images.
This schema will be implemented in Supabase using PostgreSQL.

## Tables
## users Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id | UUID | Unique Identifier for each user (primary key) |
| email | VARCHAR (255) | User's email address |
| password_hash | VARCHAR (255) | Hashed password for user authentication |
| first_name | VARCHAR (255) | User's first name |
| last_name | VARCHAR (255) | User's last name |
| created_at | TIMESTAMP | Timestamp when user account was created |
| updated_at | TIMESTAMP | Timestamp when user account was last updated |

## roles Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id | UUID | Unique identifier for each role (primary key) |
| name | VARCHAR (255) | Name of the role (Homeowner, Contractor, Adjuster, Admin |


## user_roles Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id | UUID | Unique identifier for each user-role association (primary key) |
| user_id | UUID | Foreign key referencing the Users table |
| role_id | UUID | Foreign key referencing the Roles table |
| created_at | TIMESTAMP | Timestamp when user-role association was created |


## homeowner_profiles Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id | UUID |	Unique identifier for each homeowner profile (primary key) |
| user_id |	UUID	Foreign key referencing the Users table |
| preferred_contact_method | VARCHAR (255) |	Preferred method of contact for the homeowner |
| additional_notes |	TEXT |	Additional notes about the homeowner's profile |
| created_at |	TIMESTAMP |	Timestamp when homeowner profile was created |
| updated_at |	TIMESTAMP |	Timestamp when homeowner profile was last updated |

## contractor_profiles Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id |	UUID |	Unique identifier for each contractor profile (primary key) |
| user_id |	UUID |	Foreign key referencing the Users table |
| company_name |	VARCHAR(255) |	Name of the contractor's company |
| license_number |	VARCHAR(255) |	Contractor's license number |
| specialties |	TEXT[] |	Specialties of the contractor |
| years_experience |	INTEGER |	Years of experience the contractor has |
| service_area	TEXT |	Geographic area where the contractor provides services |
| created_at |	TIMESTAMP |	Timestamp when contractor profile was created |
| updated_at |	TIMESTAMP |	Timestamp when contractor profile was last updated |

## adjuster_profiles Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id |	UUID |	Unique identifier for each insurance adjuster profile (primary key) |
| user_id |	UUID |	Foreign key referencing the Users table |
| company_name |	VARCHAR(255) |	Name of the insurance company |
| adjuster_license |	VARCHAR(255) |	License number of the insurance adjuster |
| territories |	TEXT[] |	Territories where the adjuster operates |
| created_at |	TIMESTAMP |	Timestamp when insurance adjuster profile was created |
| updated_at |	TIMESTAMP |	Timestamp when insurance adjuster profile was last updated |

## reports Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id |	UUID |	Unique identifier for each report (primary key) |
| user_id |	UUID |	Foreign key referencing the Users table |
| address |	TEXT |	Address of the property |
| status |	TEXT |	Status of the report (draft, submitted, in_review) |
| created_at |	TIMESTAMP |	Timestamp when report was created |
| updated_at |	TIMESTAMP |	Timestamp when report was last updated |

## assessments Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id |	UUID |	Unique identifier for each assessment (primary key) |
| report_id |	UUID |	Foreign key referencing the Reports table |
| damage_type |	VARCHAR(255) |	Type of damage assessed |
| severity |	VARCHAR(255) |	Severity of the damage |
| notes |	TEXT |	Additional notes about the assessment |
| created_at |	TIMESTAMP |	Timestamp when assessment was created |
| updated_at | TIMESTAMP |	Timestamp when assessment was last updated |

## images Table
| Column Name | Data Type | Description | 
|--------------|------------|------------|
| id |	UUID |	Unique identifier for each image |
| assessment_id |	UUID |	Foreign key referencing the Assessments table |
| storage_path |	VARCHAR(255) |	Path where the image is stored |
| ai_processed | BOOLEAN	Whether the image has been processed by AI |
| created_at |	TIMESTAMP	Timestamp when image was uploaded |