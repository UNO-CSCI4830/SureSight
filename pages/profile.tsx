import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import { supabase, handleSupabaseError } from '../utils/supabaseClient';
import { PageHeader, Card, LoadingSpinner, StatusMessage } from '../components/common';
import { FormInput, Select, TextArea } from '../components/ui';
import { CompleteUserProfile, HomeownerProfile, ContractorProfile, AdjusterProfile } from '../types/supabase';

// Unified profile type that includes all possible role-specific fields
type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  preferred_contact_method?: string;
  company_name?: string;
  license_number?: string;
  years_experience?: number;
  service_area?: string;
  territories?: string[];
  additional_notes?: string;
  property_count?: number;
  insurance_verified?: boolean;
  rating?: number;
  certification_verified?: boolean;
  needsProfileCompletion?: boolean;
};

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showMessageTimeout, setShowMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Editable profile fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<string>('email');
  const [companyName, setCompanyName] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('');
  const [territories, setTerritories] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchProfile();

    // Clear any existing message timeout when component unmounts
    return () => {
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
    };
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setUpdateSuccess(false);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email || '';

      // Get the complete user profile using the new function that aggregates all data
      const { data: completeProfile, error: profileError } = await supabase.rpc('get_complete_user_profile', {
        p_user_id: userId,
      });

      if (profileError) {
        throw profileError;
      }

      if (!completeProfile) {
        throw new Error('Could not fetch profile data');
      }

      // Parse the JSON result
      const userData = completeProfile as CompleteUserProfile;

      // Create a unified profile object
      const profileData: Profile = {
        id: userData.user.id,
        email: userData.user.email,
        first_name: userData.user.first_name,
        last_name: userData.user.last_name,
        role: userData.user.role.toLowerCase(),
        needsProfileCompletion: !userData.roleProfile,
      };

      // Add role-specific data based on the user's role
      if (userData.roleProfile) {
        const roleProfile = userData.roleProfile;

        if (userData.user.role.toLowerCase() === 'homeowner') {
          const homeownerProfile = roleProfile as HomeownerProfile;
          profileData.preferred_contact_method = homeownerProfile.preferred_contact_method;
          profileData.additional_notes = homeownerProfile.additional_notes || undefined;
          profileData.property_count = homeownerProfile.property_count;
        } else if (userData.user.role.toLowerCase() === 'contractor') {
          const contractorProfile = roleProfile as ContractorProfile;
          profileData.company_name = contractorProfile.company_name;
          profileData.license_number = contractorProfile.license_number || undefined;
          profileData.years_experience = contractorProfile.years_experience || undefined;
          profileData.service_area = contractorProfile.service_area || undefined;
          profileData.insurance_verified = contractorProfile.insurance_verified;
          profileData.rating = contractorProfile.rating || undefined;
        } else if (userData.user.role.toLowerCase() === 'adjuster') {
          const adjusterProfile = roleProfile as AdjusterProfile;
          profileData.company_name = adjusterProfile.company_name;
          profileData.license_number = adjusterProfile.adjuster_license || undefined;
          profileData.territories = adjusterProfile.territories || undefined;
          profileData.certification_verified = adjusterProfile.certification_verified;
        }
      }

      setProfile(profileData);

      // Set form state
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
      setSelectedRole(profileData.role || 'homeowner');
      setPreferredContactMethod(profileData.preferred_contact_method || 'email');
      setCompanyName(profileData.company_name || '');
      setLicenseNumber(profileData.license_number || '');
      setYearsExperience(profileData.years_experience?.toString() || '');
      setServiceArea(profileData.service_area || '');
      setTerritories(profileData.territories?.join(', ') || '');
      setAdditionalNotes(profileData.additional_notes || '');
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to load profile information: ${errorDetails.message}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    setSelectedRole(newRole);
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    setUpdateSuccess(false);

    try {
      if (!profile) return;

      const territoriesArray =
        selectedRole === 'adjuster'
          ? territories.split(',').map((t) => t.trim()).filter((t) => t)
          : null;

      // Use the create_user_profile function that handles creating profiles with the new schema
      const { data, error } = await supabase.rpc('create_user_profile', {
        p_email: profile.email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_role: selectedRole.toLowerCase(),
        p_auth_user_id: profile.id,
        p_avatar_url: null,
        p_phone: null, // Add this based on phone input if you add it to form
        p_preferred_contact_method: selectedRole === 'homeowner' ? preferredContactMethod : null,
        p_additional_notes: selectedRole === 'homeowner' ? additionalNotes : null,
        p_company_name: selectedRole === 'contractor' || selectedRole === 'adjuster' ? companyName : null,
        p_license_number: selectedRole === 'contractor' ? licenseNumber : null,
        p_specialties: null, // Add this based on form input if needed
        p_years_experience: selectedRole === 'contractor' ? parseInt(yearsExperience) || null : null,
        p_service_area: selectedRole === 'contractor' ? serviceArea : null,
        p_insurance_verified: false, // This would be managed by admin
        p_adjuster_license: selectedRole === 'adjuster' ? licenseNumber : null,
        p_territories: selectedRole === 'adjuster' ? territoriesArray : null,
        p_certification_verified: false, // This would be managed by admin
      });

      if (error) {
        throw error;
      }

      console.log('Profile update result:', data);

      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }

      const timeout = setTimeout(() => {
        setShowMessageTimeout(null);
      }, 5000);

      setShowMessageTimeout(timeout);

      setIsEditing(false);
      setUpdateSuccess(true);
      setMessage({
        text: 'Profile updated successfully!',
        type: 'success',
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to update profile: ${errorDetails.message}`,
        type: 'error',
      });
      setUpdateSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileView = () => {
    if (!profile) return <div>No profile information available.</div>;

    if (profile.needsProfileCompletion) {
      return (
        <div className="space-y-6">
          <StatusMessage
            type="info"
            text="Please complete your profile information to get the most out of SureSight."
            className="mb-4"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p className="mt-1 text-lg">{profile.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Name</h3>
              <p className="mt-1 text-lg">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
              <p className="mt-1 text-lg capitalize">{profile.role || 'Unknown'}</p>
            </div>
          </div>

          <div className="pt-4">
            <button type="button" className="btn-primary" onClick={() => setIsEditing(true)}>
              Complete Profile
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {updateSuccess && (
          <StatusMessage type="success" text="Profile updated successfully!" className="mb-4" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-lg">{profile.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="mt-1 text-lg">
              {profile.first_name} {profile.last_name}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
            <p className="mt-1 text-lg capitalize">{profile.role || 'Unknown'}</p>
          </div>

          {profile.role === 'homeowner' && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Preferred Contact Method</h3>
                <p className="mt-1 text-lg capitalize">{profile.preferred_contact_method || 'Email'}</p>
              </div>
              {profile.additional_notes && (
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Additional Notes</h3>
                  <p className="mt-1">{profile.additional_notes}</p>
                </div>
              )}
              {profile.property_count !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Number of Properties</h3>
                  <p className="mt-1 text-lg">{profile.property_count}</p>
                </div>
              )}
            </>
          )}

          {profile.role === 'contractor' && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                <p className="mt-1 text-lg">{profile.company_name || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">License Number</h3>
                <p className="mt-1 text-lg">{profile.license_number || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Years of Experience</h3>
                <p className="mt-1 text-lg">{profile.years_experience || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Service Area</h3>
                <p className="mt-1 text-lg">{profile.service_area || 'Not provided'}</p>
              </div>
              {profile.rating !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Rating</h3>
                  <p className="mt-1 text-lg">{profile.rating} / 5</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Insurance Verified</h3>
                <p className="mt-1 text-lg">{profile.insurance_verified ? 'Yes' : 'No'}</p>
              </div>
            </>
          )}

          {profile.role === 'adjuster' && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                <p className="mt-1 text-lg">{profile.company_name || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Adjuster License</h3>
                <p className="mt-1 text-lg">{profile.license_number || 'Not provided'}</p>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Territories</h3>
                <p className="mt-1 text-lg">
                  {profile.territories?.join(', ') || 'Not provided'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Certification Verified</h3>
                <p className="mt-1 text-lg">{profile.certification_verified ? 'Yes' : 'No'}</p>
              </div>
            </>
          )}
        </div>

        <div className="pt-4">
          <button type="button" className="btn-primary" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        </div>
      </div>
    );
  };

  const renderProfileForm = () => {
    if (!profile) return null;

    return (
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="firstName"
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            required
          />
          <FormInput
            id="lastName"
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
          />
        </div>

        <div>
          <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <Select
            id="userRole"
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            options={[
              { value: 'homeowner', label: 'Homeowner' },
              { value: 'contractor', label: 'Contractor' },
              { value: 'adjuster', label: 'Adjuster' },
            ]}
          />
          {selectedRole !== profile.role && (
            <p className="mt-1 text-xs text-amber-600">
              Changing your account type will update the information you need to provide.
            </p>
          )}
        </div>

        {selectedRole === 'homeowner' && (
          <>
            <div>
              <label htmlFor="preferredContact" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Contact Method
              </label>
              <Select
                id="preferredContact"
                value={preferredContactMethod}
                onChange={(e) => setPreferredContactMethod(e.target.value)}
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'sms', label: 'Text Message' },
                ]}
              />
            </div>
            <div>
              <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <TextArea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                placeholder="Any additional information you'd like to share"
              />
            </div>
          </>
        )}

        {selectedRole === 'contractor' && (
          <>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <FormInput
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company LLC"
                required
              />
            </div>

            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                License Number
              </label>
              <FormInput
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. CON-12345"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <FormInput
                  id="yearsExperience"
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="5"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="serviceArea" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Area
                </label>
                <FormInput
                  id="serviceArea"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. Omaha Metro Area"
                />
              </div>
            </div>
          </>
        )}

        {selectedRole === 'adjuster' && (
          <>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Company
              </label>
              <FormInput
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. State Farm Insurance"
                required
              />
            </div>

            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Adjuster License Number
              </label>
              <FormInput
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. ADJ-12345"
              />
            </div>

            <div>
              <label htmlFor="territories" className="block text-sm font-medium text-gray-700 mb-1">
                Territories
              </label>
              <FormInput
                id="territories"
                value={territories}
                onChange={(e) => setTerritories(e.target.value)}
                placeholder="e.g. Nebraska, Iowa, Kansas"
                helpText="Comma separated list of territories you cover"
              />
            </div>
          </>
        )}

        <div className="flex justify-between pt-4">
          <button type="button" onClick={() => setIsEditing(false)} className="btn-outline">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="sm" color="white" />
                <span className="ml-2">Saving...</span>
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <Layout title="My Profile | SureSight">
      <AuthGuard>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <PageHeader title="My Profile" subtitle="View and manage your profile information" />

            {message && (
              <StatusMessage
                type={message.type}
                text={message.text}
                className="mb-6"
                onDismiss={() => setMessage(null)}
              />
            )}

            <Card>
              {isLoading && !profile ? (
                <div className="flex justify-center items-center py-8">
                  <LoadingSpinner size="md" text="Loading profile..." />
                </div>
              ) : isEditing ? (
                renderProfileForm()
              ) : (
                renderProfileView()
              )}
            </Card>
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default ProfilePage;