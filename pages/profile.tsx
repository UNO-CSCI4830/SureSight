import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import { supabase, handleSupabaseError } from '../utils/supabaseClient';
import { PageHeader, Card, LoadingSpinner, StatusMessage } from '../components/common';
import { FormInput, Select, TextArea } from '../components/ui';

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  // Role-specific profile fields
  role?: string;
  preferred_contact_method?: string;
  company_name?: string;
  license_number?: string;
  years_experience?: number;
  service_area?: string;
  territories?: string[];
  additional_notes?: string;
  // Flag to track if profile needs to be created
  needsProfileCreation?: {
    homeowner?: boolean;
    contractor?: boolean;
    adjuster?: boolean;
  };
};

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email || '';
      
      const profileData: Profile = {
        id: userId,
        email: userEmail,
        first_name: '',
        last_name: '',
        role: '',
        needsProfileCreation: {
          homeowner: false,
          contractor: false,
          adjuster: false
        }
      };

      if (session.user.user_metadata) {
        const { first_name, last_name } = session.user.user_metadata;
        if (first_name) profileData.first_name = first_name;
        if (last_name) profileData.last_name = last_name;
      }

      try {
        const { data: profileRecord, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!profileError && profileRecord) {
          if (profileRecord.full_name) {
            const nameParts = profileRecord.full_name.split(' ');
            profileData.first_name = nameParts[0] || profileData.first_name;
            profileData.last_name = nameParts.slice(1).join(' ') || profileData.last_name;
          }
        }
      } catch (profileErr) {
        console.warn('Error fetching profiles table:', profileErr);
      }

      let userRole = '';
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('roles(name), role_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!roleError && roleData && roleData.roles) {
          if (typeof roleData.roles === 'object' && roleData.roles !== null) {
            userRole = Array.isArray(roleData.roles) 
              ? (roleData.roles[0]?.name || '') 
              : (roleData.roles.name || '');
          }
        } else if (roleError) {
          console.warn('Could not fetch role, setting default role:', roleError);
          userRole = 'homeowner';
          
          if (roleError.code === 'PGRST116') {
            await supabase
              .from('user_roles')
              .insert([{
                user_id: userId,
                role_id: 1,
                created_at: new Date().toISOString()
              }]);
          }
        }
      } catch (roleErr) {
        console.error('Error processing role:', roleErr);
        userRole = 'homeowner';
      }
      
      profileData.role = userRole;

      if (userRole === 'homeowner') {
        try {
          const { data: homeownerData, error: homeownerError } = await supabase
            .from('homeowner_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!homeownerError && homeownerData) {
            profileData.preferred_contact_method = homeownerData.preferred_contact_method as string;
            profileData.additional_notes = homeownerData.additional_notes as string;
          } else {
            profileData.needsProfileCreation!.homeowner = true;
            console.log('Homeowner profile needs to be created');
          }
        } catch (err) {
          console.error('Error fetching homeowner profile:', err);
          profileData.needsProfileCreation!.homeowner = true;
        }
      } else if (userRole === 'contractor') {
        try {
          const { data: contractorData, error: contractorError } = await supabase
            .from('contractor_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!contractorError && contractorData) {
            profileData.company_name = contractorData.company_name as string;
            profileData.license_number = contractorData.license_number as string;
            profileData.years_experience = contractorData.years_experience as number;
            profileData.service_area = contractorData.service_area as string;
          } else {
            profileData.needsProfileCreation!.contractor = true;
            console.log('Contractor profile needs to be created');
          }
        } catch (err) {
          console.error('Error fetching contractor profile:', err);
          profileData.needsProfileCreation!.contractor = true;
        }
      } else if (userRole === 'adjuster') {
        try {
          const { data: adjusterData, error: adjusterError } = await supabase
            .from('adjuster_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!adjusterError && adjusterData) {
            profileData.company_name = adjusterData.company_name as string;
            profileData.license_number = adjusterData.adjuster_license as string;
            profileData.territories = adjusterData.territories as string[];
          } else {
            profileData.needsProfileCreation!.adjuster = true;
            console.log('Adjuster profile needs to be created');
          }
        } catch (err) {
          console.error('Error fetching adjuster profile:', err);
          profileData.needsProfileCreation!.adjuster = true;
        }
      }

      setProfile(profileData);
      
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
        type: 'error'
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
      
      const territoriesArray = selectedRole === 'adjuster' 
        ? territories.split(',').map(t => t.trim()).filter(t => t) 
        : null;

      const { data, error } = await supabase.rpc('manage_user_profile', {
        p_user_id: profile.id,
        p_email: profile.email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_role: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1),
        p_avatar_url: null,
        p_preferred_contact_method: selectedRole === 'homeowner' ? preferredContactMethod : null,
        p_additional_notes: selectedRole === 'homeowner' ? additionalNotes : null,
        p_company_name: (selectedRole === 'contractor' || selectedRole === 'adjuster') ? companyName : null,
        p_license_number: selectedRole === 'contractor' ? licenseNumber : null,
        p_specialties: null,
        p_years_experience: selectedRole === 'contractor' ? (parseInt(yearsExperience) || 0) : null,
        p_service_area: selectedRole === 'contractor' ? serviceArea : null,
        p_adjuster_license: selectedRole === 'adjuster' ? licenseNumber : null,
        p_territories: selectedRole === 'adjuster' ? territoriesArray : null
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
        type: 'success'
      });
      
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to update profile: ${errorDetails.message}`,
        type: 'error'
      });
      setUpdateSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileView = () => {
    if (!profile) return <div>No profile information available.</div>;

    const needsProfileCreation = profile.needsProfileCreation?.homeowner || 
                               profile.needsProfileCreation?.contractor || 
                               profile.needsProfileCreation?.adjuster;

    if (needsProfileCreation) {
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
              <p className="mt-1 text-lg">{profile.first_name} {profile.last_name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
              <p className="mt-1 text-lg capitalize">{profile.role || 'Unknown'}</p>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Complete Profile
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {updateSuccess && (
          <StatusMessage
            type="success"
            text="Profile updated successfully!"
            className="mb-4"
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-lg">{profile.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="mt-1 text-lg">{profile.first_name} {profile.last_name}</p>
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
            </>
          )}
        </div>
        
        <div className="pt-4">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsEditing(true)}
          >
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
              { value: 'adjuster', label: 'Adjuster' }
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
                  { value: 'text', label: 'Text Message' }
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
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="btn-outline"
          >
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
            <PageHeader 
              title="My Profile" 
              subtitle="View and manage your profile information" 
            />
            
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
              ) : (
                isEditing ? renderProfileForm() : renderProfileView()
              )}
            </Card>
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default ProfilePage;