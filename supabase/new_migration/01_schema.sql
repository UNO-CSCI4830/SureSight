-- New SureSight Database Schema Migration
-- This script rebuilds the SureSight schema to be more robust, normalized,
-- and better utilize Supabase features

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types for better data validation
DO $$
BEGIN
    -- User Role Type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('homeowner', 'contractor', 'adjuster', 'admin');
    END IF;
    
    -- Report Status Type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected');
    END IF;
    
    -- Contact Method Type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_method') THEN
        CREATE TYPE contact_method AS ENUM ('email', 'phone', 'sms');
    END IF;
    
    -- Damage Type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'damage_type') THEN
        CREATE TYPE damage_type AS ENUM ('roof', 'siding', 'window', 'structural', 'water', 'other');
    END IF;
    
    -- Damage Severity
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'damage_severity') THEN
        CREATE TYPE damage_severity AS ENUM ('minor', 'moderate', 'severe', 'critical');
    END IF;
END$$;

-- Drop existing tables with CASCADE to ensure dependencies are removed
-- Make sure to drop in reverse dependency order
DROP TABLE IF EXISTS public.images CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.adjuster_profiles CASCADE;
DROP TABLE IF EXISTS public.contractor_profiles CASCADE;
DROP TABLE IF EXISTS public.homeowner_profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.table_1 CASCADE;
DROP TABLE IF EXISTS public.table_name CASCADE;

-- Create new users table with improved structure
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    auth_user_id UUID UNIQUE,  -- Link to Supabase auth.users
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    email_confirmed BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create profiles table with inheritance pattern for different user types
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Homeowner profile (extends profiles)
CREATE TABLE homeowner_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    preferred_contact_method contact_method DEFAULT 'email',
    additional_notes TEXT,
    property_count INTEGER DEFAULT 1
);

-- Contractor profile (extends profiles)
CREATE TABLE contractor_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    license_number TEXT,
    specialties TEXT[],
    years_experience INTEGER,
    service_area TEXT,
    insurance_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2)
);

-- Insurance adjuster profile (extends profiles)
CREATE TABLE adjuster_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    adjuster_license TEXT,
    territories TEXT[],
    certification_verified BOOLEAN DEFAULT FALSE
);

-- Property table (many properties can belong to one homeowner)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homeowner_id UUID NOT NULL REFERENCES homeowner_profiles(id) ON DELETE CASCADE,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'USA',
    property_type TEXT,
    year_built INTEGER,
    square_footage INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table (improved with better relationships and metadata)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    incident_date DATE,
    status report_status DEFAULT 'draft',
    contractor_id UUID REFERENCES contractor_profiles(id),
    adjuster_id UUID REFERENCES adjuster_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ
);

-- Assessment areas table
CREATE TABLE assessment_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    damage_type damage_type NOT NULL,
    location TEXT NOT NULL, -- e.g., "North side", "Master bedroom"
    severity damage_severity NOT NULL,
    dimensions TEXT, -- e.g. "10ft x 12ft"
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Images table with enhanced metadata
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_area_id UUID REFERENCES assessment_areas(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE, -- Allow images to be linked directly to reports too
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    width INTEGER,
    height INTEGER,
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(5,2),
    ai_damage_type damage_type,
    ai_damage_severity damage_severity,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB -- For any additional metadata from EXIF or AI processing
);

-- Comments table for collaboration 
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threaded comments
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities for audit trail
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Estimate table for contractors
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE, 
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id),
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    labor_cost DECIMAL(10,2),
    materials_cost DECIMAL(10,2),
    description TEXT,
    valid_until DATE,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Estimate line items
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table for user notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    notification_type TEXT NOT NULL,
    related_id UUID,  -- Can reference various entities (reports, comments, etc.)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table for direct messaging between users
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_property ON reports(property_id);
CREATE INDEX idx_reports_creator ON reports(creator_id);
CREATE INDEX idx_images_assessment ON images(assessment_area_id);
CREATE INDEX idx_images_report ON images(report_id);
CREATE INDEX idx_activities_report ON activities(report_id);
CREATE INDEX idx_properties_homeowner ON properties(homeowner_id);
CREATE INDEX idx_reports_contractor ON reports(contractor_id);
CREATE INDEX idx_reports_adjuster ON reports(adjuster_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(is_read);