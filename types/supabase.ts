// filepath: c:\Users\scott\Documents\My_Programming_Projects\.GithubClones\Suresight\SureSight\types\supabase.ts
// Re-export the types from the main database types file
import { Database } from './database.types';
export type { Database } from './database.types';

// Export common type helpers
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Common type helpers for working with Supabase
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Type definitions for common entities
export type User = Tables<'users'>;
export type Profile = Tables<'profiles'>;
export type HomeownerProfile = Tables<'homeowner_profiles'>;
export type ContractorProfile = Tables<'contractor_profiles'>;
export type AdjusterProfile = Tables<'adjuster_profiles'>;
export type Property = Tables<'properties'>;
export type Report = Tables<'reports'>;
export type AssessmentArea = Tables<'assessment_areas'>;
export type Image = Tables<'images'>;
export type UserRole = Enums<'user_role'>;
export type ReportStatus = Enums<'report_status'>;
export type DamageType = Enums<'damage_type'>;
export type DamageSeverity = Enums<'damage_severity'>;
export type ContactMethod = Enums<'contact_method'>;

// Complete user profile type with role-specific data
export interface CompleteUserProfile {
  user: User;
  profile: Profile;
  roleProfile: HomeownerProfile | ContractorProfile | AdjusterProfile | null;
}