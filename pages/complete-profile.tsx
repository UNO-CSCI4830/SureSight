import React from 'react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { supabase } from '../utils/supabaseClient';
import { FormInput, Select, Button } from '../components/ui';
import { StatusMessage, Card, LoadingSpinner } from '../components/common';

// Define TypeScript interface for user record
interface UserRecord {
  id: string;
  auth_user_id?: string | null;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  role?: string;
  email?: string;
}

const CompleteProfile = () => {
  const router = useRouter();
  const { userId: urlUserId } = router.query; // Extract userId from URL
  
  // State variables for user management
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [roles, setRoles] = useState([
    { value: 'homeowner', label: 'Homeowner' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'adjuster', label: 'Insurance Adjuster' }
  ]);
  
  // Role-specific fields
  const [preferredContactMethod, setPreferredContactMethod] = useState<string>('email');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('');
  const [territories, setTerritories] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Only run if router is ready
    if (!router.isReady) return;
    
    async function getUserInfo() {
      setLoading(true);
      try {
        // Get the currently authenticated user from Supabase auth
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error fetching authenticated user:', authError);
          throw new Error('Authentication error. Please log in again.');
        }
        
        if (!authUser) {
          throw new Error('You must be logged in to complete your profile');
        }
        
        // Set auth user ID and email
        const authUserId = authUser.id;
        setAuthUserId(authUserId);
        setEmail(authUser.email || '');
        
        console.log("Auth user ID:", authUserId);
        
        // Try to get the user's database ID from local storage (set during login)
        const storedUserDbId = localStorage.getItem('supaUserDbId');
        if (storedUserDbId) {
          console.log("Found stored user DB ID:", storedUserDbId);
        }
        
        // 1. First try to get user by their database ID from local storage
        let userRecord: UserRecord | null = null;
        
        if (storedUserDbId) {
          const { data: userById, error: userByIdError } = await supabase
            .from('users')
            .select('id, auth_user_id, first_name, last_name, phone, role, email')
            .eq('id', storedUserDbId)
            .maybeSingle();
            
          if (userByIdError) {
            console.error('Error fetching user by stored ID:', userByIdError);
          } else if (userById) {
            console.log("Found user by stored DB ID");
            userRecord = userById;
          }
        }
        
        // 2. If not found, try by auth_user_id
        if (!userRecord) {
          const { data: userByAuthId, error: userByAuthIdError } = await supabase
            .from('users')
            .select('id, auth_user_id, first_name, last_name, phone, role, email')
            .eq('auth_user_id', authUserId)
            .maybeSingle();
            
          if (userByAuthIdError) {
            console.error('Error fetching user by auth_user_id:', userByAuthIdError);
          } else if (userByAuthId) {
            console.log("Found user by auth_user_id");
            userRecord = userByAuthId;
          }
        }
        
        // 3. If still not found, try by email
        if (!userRecord && authUser.email) {
          const { data: userByEmail, error: userByEmailError } = await supabase
            .from('users')
            .select('id, auth_user_id, first_name, last_name, phone, role, email')
            .eq('email', authUser.email)
            .maybeSingle();
            
          if (userByEmailError) {
            console.error('Error fetching user by email:', userByEmailError);
          } else if (userByEmail) {
            console.log("Found user by email");
            userRecord = userByEmail;
            
            // Update auth_user_id if it doesn't match
            if (userByEmail.auth_user_id !== authUserId) {
              console.log("Updating auth_user_id for existing user");
              await supabase
                .from('users')
                .update({ auth_user_id: authUserId })
                .eq('id', userByEmail.id);
                
              userRecord.auth_user_id = authUserId;
            }
          }
        }
        
        // If we found a user record, populate form fields
        if (userRecord) {
          setUserId(userRecord.id);
          // Store this ID in local storage for future use
          localStorage.setItem('supaUserDbId', userRecord.id);
          
          // Pre-fill form fields with existing data
          if (userRecord.first_name) setFirstName(userRecord.first_name);
          if (userRecord.last_name) setLastName(userRecord.last_name);
          if (userRecord.phone) setPhone(userRecord.phone);
          if (userRecord.role) setRole(userRecord.role);
          
          // Get role from user metadata if available and not set in DB
          if (!userRecord.role && authUser.user_metadata?.role) {
            setRole(authUser.user_metadata.role);
          }
          
          console.log("User record:", userRecord);
          
          // If we have a user record with a role, fetch the role-specific profile data
          if (userRecord.role) {
            // Check if user already has a profile
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', userRecord.id)
              .maybeSingle();
              
            if (profileError) {
              console.error('Error checking profile:', profileError);
            }
            
            if (profileData?.id) {
              // User has a profile, fetch role-specific data
              const profileId = profileData.id;
              
              if (userRecord.role === 'homeowner') {
                const { data: homeownerData } = await supabase
                  .from('homeowner_profiles')
                  .select('preferred_contact_method, additional_notes')
                  .eq('id', profileId)
                  .maybeSingle();
                
                if (homeownerData) {
                  setPreferredContactMethod(homeownerData.preferred_contact_method || 'email');
                  setAdditionalNotes(homeownerData.additional_notes || '');
                }
              } 
              else if (userRecord.role === 'contractor') {
                const { data: contractorData } = await supabase
                  .from('contractor_profiles')
                  .select('company_name, license_number, years_experience, service_area')
                  .eq('id', profileId)
                  .maybeSingle();
                
                if (contractorData) {
                  setCompanyName(contractorData.company_name || '');
                  setLicenseNumber(contractorData.license_number || '');
                  setYearsExperience(contractorData.years_experience?.toString() || '');
                  setServiceArea(contractorData.service_area || '');
                }
              }
              else if (userRecord.role === 'adjuster') {
                const { data: adjusterData } = await supabase
                  .from('adjuster_profiles')
                  .select('company_name, adjuster_license, territories')
                  .eq('id', profileId)
                  .maybeSingle();
                
                if (adjusterData) {
                  setCompanyName(adjusterData.company_name || '');
                  setLicenseNumber(adjusterData.adjuster_license || '');
                  setTerritories(Array.isArray(adjusterData.territories) ? adjusterData.territories.join(', ') : '');
                }
              }
            }
          }
        } else {
          // No user record found, we'll create one on form submission
          console.log("No existing user record found. Will create one on form submission.");
          
          // If role is in metadata, use it
          if (authUser.user_metadata?.role) {
            setRole(authUser.user_metadata.role);
          }
        }
      } catch (err: any) {
        console.error('Error loading user data:', err);
        setError(err.message || 'Error loading user data');
      } finally {
        setLoading(false);
      }
    }
    
    getUserInfo();
  }, [router.isReady, urlUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authUserId) {
      setError('User ID is required. Please log in again.');
      return;
    }
    
    if (!role) {
      setError('Please select your user type.');
      return;
    }
    
    if (!firstName || !lastName) {
      setError('First name and last name are required.');
      return;
    }
    
    setError('');
    setSubmitting(true);
    
    try {
      // Step 1: Update user metadata with role if changed
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role }
      });
      
      if (metaError) throw metaError;
      
      let userRecord;
      
      // Step 2: Update or create the user record
      if (userId) {
        // Update existing user record
        const { data, error: updateError } = await supabase
          .from('users')
          .update({ 
            auth_user_id: authUserId, // Ensure auth_user_id is set correctly
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role: role,
            email_confirmed: true
          })
          .eq('id', userId)
          .select()
          .single();
          
        if (updateError) throw updateError;
        userRecord = data;
      } else {
        // Create new user record
        const { data, error: insertError } = await supabase
          .from('users')
          .insert({ 
            auth_user_id: authUserId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role: role,
            email_confirmed: true
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        userRecord = data;
        
        // Store the user ID in local storage
        localStorage.setItem('supaUserDbId', userRecord.id);
      }
      
      // Step 3: Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userRecord.id)
        .maybeSingle();
        
      if (profileCheckError) {
        console.error('Error checking for existing profile:', profileCheckError);
      }
      
      let profileId;
      
      // Create profile if it doesn't exist
      if (!existingProfile) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            user_id: userRecord.id
          })
          .select('id')
          .single();
          
        if (profileError || !profileData?.id) {
          throw profileError || new Error('Profile creation failed');
        }
        
        profileId = profileData.id;
      } else {
        profileId = existingProfile.id;
      }
      
      // Step 4: Insert or update role-specific profile
      if (role === 'homeowner') {
        // Check if homeowner profile exists
        const { data: existingHomeowner } = await supabase
          .from('homeowner_profiles')
          .select('id')
          .eq('id', profileId)
          .maybeSingle();
          
        if (existingHomeowner) {
          // Update existing profile
          await supabase.from('homeowner_profiles').update({
            preferred_contact_method: preferredContactMethod,
            additional_notes: additionalNotes || null
          }).eq('id', profileId);
        } else {
          // Create new profile
          await supabase.from('homeowner_profiles').insert({
            id: profileId,
            preferred_contact_method: preferredContactMethod,
            additional_notes: additionalNotes || null
          });
        }
      } else if (role === 'contractor') {
        // Check if contractor profile exists
        const { data: existingContractor } = await supabase
          .from('contractor_profiles')
          .select('id')
          .eq('id', profileId)
          .maybeSingle();
          
        if (existingContractor) {
          // Update existing profile
          await supabase.from('contractor_profiles').update({
            company_name: companyName,
            license_number: licenseNumber || null,
            years_experience: yearsExperience ? parseInt(yearsExperience) : null,
            service_area: serviceArea || null
          }).eq('id', profileId);
        } else {
          // Create new profile
          await supabase.from('contractor_profiles').insert({
            id: profileId,
            company_name: companyName,
            license_number: licenseNumber || null,
            years_experience: yearsExperience ? parseInt(yearsExperience) : null,
            service_area: serviceArea || null,
            insurance_verified: false
          });
        }
      } else if (role === 'adjuster') {
        // Check if adjuster profile exists
        const { data: existingAdjuster } = await supabase
          .from('adjuster_profiles')
          .select('id')
          .eq('id', profileId)
          .maybeSingle();
          
        if (existingAdjuster) {
          // Update existing profile
          await supabase.from('adjuster_profiles').update({
            company_name: companyName,
            adjuster_license: licenseNumber || null,
            territories: territories ? territories.split(',').map(t => t.trim()).filter(t => t) : []
          }).eq('id', profileId);
        } else {
          // Create new profile
          await supabase.from('adjuster_profiles').insert({
            id: profileId,
            company_name: companyName,
            adjuster_license: licenseNumber || null,
            territories: territories ? territories.split(',').map(t => t.trim()).filter(t => t) : [],
            certification_verified: false
          });
        }
      }
      
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
      
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(err.message || 'Error completing profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Complete Your Profile | SureSight">
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" />
          <span className="ml-3">Loading your profile...</span>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title="Profile Complete | SureSight">
        <Card className="max-w-md mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Created Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your profile has been set up. You'll be redirected to your dashboard shortly.
          </p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Complete Your Profile | SureSight">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-600 mt-2">Please provide a few more details to set up your account</p>
        </div>
        
        <Card>
          {error && <StatusMessage type="error" text={error} className="mb-6" />}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">Basic Information</h2>
              
              <div className="flex space-x-4">
                <div className="flex-1">
                  <FormInput 
                    label="First Name" 
                    type="text" 
                    id="firstName" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    inputClassName="bg-white text-gray-900"
                    required 
                  />
                </div>
                <div className="flex-1">
                  <FormInput 
                    label="Last Name" 
                    type="text" 
                    id="lastName" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    inputClassName="bg-white text-gray-900"
                    required 
                  />
                </div>
              </div>
              
              <FormInput
                label="Email Address"
                type="email"
                id="email"
                value={email}
                onChange={() => {}} // Add empty handler since field is disabled
                disabled={true}
                helpText="Email address cannot be changed"
              />
              
              <FormInput 
                label="Phone Number" 
                type="tel" 
                id="phone" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                helpText="Optional: Format will be standardized" 
                inputClassName="bg-white text-gray-900"
              />
              
              <Select
                label="I am a..."
                id="role"
                value={role}
                onChange={e => setRole(e.target.value)}
                options={roles}
                required
                helpText="Select the option that best describes you"
                inputClassName="bg-white text-gray-900"
              />
            </div>
            
            {/* Role-specific fields */}
            {role && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">
                  {role === 'homeowner' ? 'Homeowner Details' : 
                   role === 'contractor' ? 'Contractor Details' : 
                   'Adjuster Details'}
                </h2>
                
                {role === 'homeowner' && (
                  <>
                    <Select
                      label="Preferred Contact Method"
                      id="preferredContactMethod"
                      value={preferredContactMethod}
                      onChange={e => setPreferredContactMethod(e.target.value)}
                      options={[
                        { value: 'email', label: 'Email' }, 
                        { value: 'phone', label: 'Phone' }, 
                        { value: 'sms', label: 'SMS' }
                      ]}
                      inputClassName="bg-white text-gray-900"
                    />
                    <FormInput
                      label="Additional Notes"
                      type="text"
                      id="additionalNotes"
                      value={additionalNotes}
                      onChange={e => setAdditionalNotes(e.target.value)}
                      placeholder="Any special instructions"
                      inputClassName="bg-white text-gray-900"
                    />
                  </>
                )}
                
                {role === 'contractor' && (
                  <>
                    <FormInput 
                      label="Company Name" 
                      type="text" 
                      id="companyName" 
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                      inputClassName="bg-white text-gray-900"
                      required 
                    />
                    <FormInput 
                      label="License Number" 
                      type="text" 
                      id="licenseNumber" 
                      value={licenseNumber} 
                      onChange={e => setLicenseNumber(e.target.value)} 
                      inputClassName="bg-white text-gray-900"
                    />
                    <FormInput 
                      label="Years of Experience" 
                      type="number" 
                      id="yearsExperience" 
                      value={yearsExperience} 
                      onChange={e => setYearsExperience(e.target.value)} 
                      inputClassName="bg-white text-gray-900"
                    />
                    <FormInput 
                      label="Service Area" 
                      type="text" 
                      id="serviceArea" 
                      value={serviceArea} 
                      onChange={e => setServiceArea(e.target.value)} 
                      placeholder="e.g., Northeast Ohio, Dallas Metro"
                      inputClassName="bg-white text-gray-900"
                    />
                  </>
                )}
                
                {role === 'adjuster' && (
                  <>
                    <FormInput 
                      label="Company Name" 
                      type="text" 
                      id="companyName" 
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                      inputClassName="bg-white text-gray-900"
                      required 
                    />
                    <FormInput 
                      label="Adjuster License" 
                      type="text" 
                      id="licenseNumber" 
                      value={licenseNumber} 
                      onChange={e => setLicenseNumber(e.target.value)} 
                      inputClassName="bg-white text-gray-900"
                    />
                    <FormInput 
                      label="Territories (comma-separated)" 
                      type="text" 
                      id="territories" 
                      value={territories} 
                      onChange={e => setTerritories(e.target.value)}
                      inputClassName="bg-white text-gray-900"
                      placeholder="e.g., TX, OH, MI" 
                    />
                  </>
                )}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full"
              isLoading={submitting}
            >
              {submitting ? 'Saving Profile...' : 'Complete Profile'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default CompleteProfile;