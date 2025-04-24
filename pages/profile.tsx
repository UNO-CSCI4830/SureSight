import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import { supabase, handleSupabaseError, Database } from '../utils/supabaseClient';

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
      // Get the current authenticated user
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
      
      // Initialize the profile with user data from the auth session
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

      // Try to get user metadata from session first
      if (session.user.user_metadata) {
        const { first_name, last_name } = session.user.user_metadata;
        if (first_name) profileData.first_name = first_name;
        if (last_name) profileData.last_name = last_name;
      }

      // Get user's profile from profiles table instead of users table
      try {
        const { data: profileRecord, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!profileError && profileRecord) {
          // Parse full_name into first_name and last_name if available
          if (profileRecord.full_name) {
            const nameParts = profileRecord.full_name.split(' ');
            profileData.first_name = nameParts[0] || profileData.first_name;
            profileData.last_name = nameParts.slice(1).join(' ') || profileData.last_name;
          }
        }
      } catch (profileErr) {
        console.warn('Error fetching profiles table:', profileErr);
      }

      // Get user's role with better error handling
      let userRole = '';
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('roles(name), role_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!roleError && roleData && roleData.roles) {
          if (typeof roleData.roles === 'object' && roleData.roles !== null) {
            // Handle both array format and direct object format
            userRole = Array.isArray(roleData.roles) 
              ? (roleData.roles[0]?.name || '') 
              : (roleData.roles.name || '');
          }
        } else if (roleError) {
          console.warn('Could not fetch role, setting default role:', roleError);
          // Default to homeowner if role can't be determined
          userRole = 'homeowner';
          
          // Create a role entry if it doesn't exist
          if (roleError.code === 'PGRST116') {
            await supabase
              .from('user_roles')
              .insert([{
                user_id: userId,
                role_id: 1, // Assuming 1 is the homeowner role_id
                created_at: new Date().toISOString()
              }]);
          }
        }
      } catch (roleErr) {
        console.error('Error processing role:', roleErr);
        userRole = 'homeowner'; // Default fallback
      }
      
      profileData.role = userRole;

      // Fetch role-specific profile data
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
      
      // Initialize form fields
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
      
      // Parse territories into an array if role is adjuster
      const territoriesArray = selectedRole === 'adjuster' 
        ? territories.split(',').map(t => t.trim()).filter(t => t) 
        : null;

      // Use the manage_user_profile function to update everything in one call
      const { data, error } = await supabase.rpc('manage_user_profile', {
        p_user_id: profile.id,
        p_email: profile.email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_role: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1), // Capitalize first letter
        // Generic profile fields
        p_avatar_url: null,
        // Homeowner fields
        p_preferred_contact_method: selectedRole === 'homeowner' ? preferredContactMethod : null,
        p_additional_notes: selectedRole === 'homeowner' ? additionalNotes : null,
        // Contractor fields
        p_company_name: (selectedRole === 'contractor' || selectedRole === 'adjuster') ? companyName : null,
        p_license_number: selectedRole === 'contractor' ? licenseNumber : null,
        p_specialties: null, // Not currently in the form
        p_years_experience: selectedRole === 'contractor' ? (parseInt(yearsExperience) || 0) : null,
        p_service_area: selectedRole === 'contractor' ? serviceArea : null,
        // Adjuster fields
        p_adjuster_license: selectedRole === 'adjuster' ? licenseNumber : null,
        p_territories: selectedRole === 'adjuster' ? territoriesArray : null
      }) as any; // Type assertion to resolve the type mismatch
      
      if (error) {
        throw error;
      }

      // Log the result from the function
      console.log('Profile update result:', data);
      
      // Ensure message stays visible for at least 5 seconds
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
      
      const timeout = setTimeout(() => {
        // Only clear the message after 5 seconds if we're still showing the same one
        setShowMessageTimeout(null);
      }, 5000);
      
      setShowMessageTimeout(timeout);
      
      // Update UI state
      setIsEditing(false);
      setUpdateSuccess(true);
      setMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      });
      
      // Refresh profile data
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

  const getMessageClass = () => {
    if (!message) return '';
    
    switch (message.type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const renderProfileView = () => {
    if (!profile) return <div>No profile information available.</div>;

    // Check if a role-specific profile needs to be created
    const needsProfileCreation = profile.needsProfileCreation?.homeowner || 
                               profile.needsProfileCreation?.contractor || 
                               profile.needsProfileCreation?.adjuster;

    if (needsProfileCreation) {
      return (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
            <h3 className="font-medium text-lg mb-2">Complete Your Profile</h3>
            <p>Please complete your profile information to get the most out of SureSight.</p>
          </div>

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
          <div className="p-3 bg-green-100 text-green-700 border border-green-200 rounded-md mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Profile updated successfully!</span>
          </div>
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

          {/* Homeowner-specific fields */}
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

          {/* Contractor-specific fields */}
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

          {/* Adjuster-specific fields */}
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
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="form-input"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            id="userRole"
            name="userRole"
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="form-input"
            aria-label="Select account type"
          >
            <option value="homeowner">Homeowner</option>
            <option value="contractor">Contractor</option>
            <option value="adjuster">Adjuster</option>
          </select>
          {selectedRole !== profile.role && (
            <p className="mt-1 text-xs text-amber-600">
              Changing your account type will update the information you need to provide.
            </p>
          )}
        </div>

        {/* Homeowner-specific fields */}
        {selectedRole === 'homeowner' && (
          <>
            <div>
              <label htmlFor="preferredContact" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Contact Method
              </label>
              <select
                id="preferredContact"
                name="preferredContact"
                value={preferredContactMethod}
                onChange={(e) => setPreferredContactMethod(e.target.value)}
                className="form-input"
                aria-label="Select preferred contact method"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="text">Text Message</option>
              </select>
            </div>
            <div>
              <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="additionalNotes"
                name="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="form-input"
                placeholder="Any additional information you'd like to share"
              />
            </div>
          </>
        )}

        {/* Contractor-specific fields */}
        {selectedRole === 'contractor' && (
          <>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="form-input"
                placeholder="Your Company LLC"
              />
            </div>
            
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                License Number
              </label>
              <input
                type="text"
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="form-input"
                placeholder="e.g. CON-12345"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  id="yearsExperience"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="form-input"
                  placeholder="5"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="serviceArea" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Area
                </label>
                <input
                  type="text"
                  id="serviceArea"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Omaha Metro Area"
                />
              </div>
            </div>
          </>
        )}

        {/* Adjuster-specific fields */}
        {selectedRole === 'adjuster' && (
          <>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Company
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="form-input"
                placeholder="e.g. State Farm Insurance"
              />
            </div>
            
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Adjuster License Number
              </label>
              <input
                type="text"
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="form-input"
                placeholder="e.g. ADJ-12345"
              />
            </div>
            
            <div>
              <label htmlFor="territories" className="block text-sm font-medium text-gray-700 mb-1">
                Territories
              </label>
              <input
                type="text"
                id="territories"
                value={territories}
                onChange={(e) => setTerritories(e.target.value)}
                className="form-input"
                placeholder="e.g. Nebraska, Iowa, Kansas"
              />
              <p className="mt-1 text-xs text-gray-500">Comma separated list of territories you cover</p>
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
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
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
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">My Profile</h1>
              <p className="text-gray-600">View and manage your profile information</p>
            </div>
            
            {message && (
              <div className={`mb-6 p-4 rounded-md border ${getMessageClass()}`}>
                <p>{message.text}</p>
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow p-6">
              {isLoading && !profile ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                isEditing ? renderProfileForm() : renderProfileView()
              )}
            </div>
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default ProfilePage;