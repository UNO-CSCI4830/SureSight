import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import { supabase } from '../utils/supabaseClient';

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
};

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Editable profile fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<string>('email');
  const [companyName, setCompanyName] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('');
  const [territories, setTerritories] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
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

      // Get basic user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Get user's role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId)
        .single();

      let userRole = '';
      if (!roleError && roleData && roleData.roles) {
        // Access the name correctly from the returned structure
        userRole = Array.isArray(roleData.roles) && roleData.roles[0]?.name || '';
      }

      // Initialize the profile with user data
      const profileData: Profile = {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userRole
      };

      // Fetch role-specific profile data
      if (userRole === 'homeowner') {
        const { data: homeownerData, error: homeownerError } = await supabase
          .from('homeowner_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!homeownerError && homeownerData) {
          profileData.preferred_contact_method = homeownerData.preferred_contact_method;
          profileData.additional_notes = homeownerData.additional_notes;
        }
      } else if (userRole === 'contractor') {
        const { data: contractorData, error: contractorError } = await supabase
          .from('contractor_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!contractorError && contractorData) {
          profileData.company_name = contractorData.company_name;
          profileData.license_number = contractorData.license_number;
          profileData.years_experience = contractorData.years_experience;
          profileData.service_area = contractorData.service_area;
        }
      } else if (userRole === 'adjuster') {
        const { data: adjusterData, error: adjusterError } = await supabase
          .from('adjuster_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!adjusterError && adjusterData) {
          profileData.company_name = adjusterData.company_name;
          profileData.license_number = adjusterData.adjuster_license;
          profileData.territories = adjusterData.territories;
        }
      }

      setProfile(profileData);
      
      // Initialize form fields
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
      setPreferredContactMethod(profileData.preferred_contact_method || 'email');
      setCompanyName(profileData.company_name || '');
      setLicenseNumber(profileData.license_number || '');
      setYearsExperience(profileData.years_experience?.toString() || '');
      setServiceArea(profileData.service_area || '');
      setTerritories(profileData.territories?.join(', ') || '');
      setAdditionalNotes(profileData.additional_notes || '');
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setMessage({
        text: 'Failed to load profile information. Please try again later.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    
    try {
      if (!profile) return;
      
      const timestamp = new Date().toISOString();
      
      // Update basic user information
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: timestamp
        })
        .eq('id', profile.id);
        
      if (userUpdateError) throw userUpdateError;
      
      // Update role-specific profile
      if (profile.role === 'homeowner') {
        const { error: homeownerError } = await supabase
          .from('homeowner_profiles')
          .update({
            preferred_contact_method: preferredContactMethod,
            additional_notes: additionalNotes,
            updated_at: timestamp
          })
          .eq('user_id', profile.id);
          
        if (homeownerError) throw homeownerError;
      } 
      else if (profile.role === 'contractor') {
        const { error: contractorError } = await supabase
          .from('contractor_profiles')
          .update({
            company_name: companyName,
            license_number: licenseNumber,
            years_experience: parseInt(yearsExperience) || 0,
            service_area: serviceArea,
            updated_at: timestamp
          })
          .eq('user_id', profile.id);
          
        if (contractorError) throw contractorError;
      } 
      else if (profile.role === 'adjuster') {
        const { error: adjusterError } = await supabase
          .from('adjuster_profiles')
          .update({
            company_name: companyName,
            adjuster_license: licenseNumber,
            territories: territories.split(',').map(t => t.trim()),
            updated_at: timestamp
          })
          .eq('user_id', profile.id);
          
        if (adjusterError) throw adjusterError;
      }
      
      // Update generic profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({
          full_name: `${firstName} ${lastName}`
        })
        .eq('id', profile.id);
        
      if (profilesError) {
        console.error('Error updating profiles table:', profilesError);
      }
      
      setIsEditing(false);
      setMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      });
      
      // Refresh profile data
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({
        text: 'Failed to update profile. Please try again later.',
        type: 'error'
      });
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

    return (
      <div className="space-y-6">
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

        {/* Homeowner-specific fields */}
        {profile.role === 'homeowner' && (
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
        {profile.role === 'contractor' && (
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
        {profile.role === 'adjuster' && (
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