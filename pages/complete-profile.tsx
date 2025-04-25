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
    // Only run if router is ready and query params are available
    if (!router.isReady) return;
    
    async function getUserInfo() {
      setLoading(true);
      try {
        let userRecord: UserRecord | null = null;
        
        // First check if we have a userId in the URL
        if (urlUserId && typeof urlUserId === 'string') {
          console.log("Loading user from URL userId:", urlUserId);
          
          // First try to fetch user by primary ID
          let { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('id, auth_user_id, first_name, last_name, phone, role, email')
            .eq('id', urlUserId)
            .maybeSingle();
            
          if (existingUserError) {
            console.error('Error fetching user by primary ID:', existingUserError);
          }
          
          // If not found by primary ID, try auth_user_id
          if (!existingUser) {
            console.log("User not found by primary ID, trying auth_user_id");
            const { data: authUser, error: authUserError } = await supabase
              .from('users')
              .select('id, auth_user_id, first_name, last_name, phone, role, email')
              .eq('auth_user_id', urlUserId)
              .maybeSingle();
              
            if (authUserError) {
              console.error('Error fetching user by auth_user_id:', authUserError);
            }
            
            existingUser = authUser;
            
            // If still not found, try by email (useful when urlUserId actually contains an email)
            if (!existingUser) {
              console.log("User not found by auth_user_id, trying email lookup");
              const { data: emailUser, error: emailUserError } = await supabase
                .from('users')
                .select('id, auth_user_id, first_name, last_name, phone, role, email')
                .eq('email', urlUserId)
                .maybeSingle();
                
              if (emailUserError) {
                console.error('Error fetching user by email:', emailUserError);
              }
              
              existingUser = emailUser;
            }
          }
          
          if (existingUser) {
            userRecord = existingUser as UserRecord;
            setUserId(existingUser.id);
            setAuthUserId(existingUser.auth_user_id);
            setEmail(existingUser.email || '');
            
            // Pre-fill form fields with existing data
            if (existingUser.first_name) setFirstName(existingUser.first_name);
            if (existingUser.last_name) setLastName(existingUser.last_name);
            if (existingUser.phone) setPhone(existingUser.phone);
            if (existingUser.role) setRole(existingUser.role);
          } else {
            console.error('User not found with the provided ID or email:', urlUserId);
            setError('User not found. Please sign up or login first.');
          }
        } else {
          // No userId in URL, use the current authenticated user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }
          
          if (!user) {
            throw new Error('You must be logged in to complete your profile');
          }
          
          // Set auth user ID
          setAuthUserId(user.id);
          setEmail(user.email || '');
          
          // Get role from user metadata if available
          if (user.user_metadata?.role) {
            setRole(user.user_metadata.role);
          }
          
          // Check if a user record already exists in the DB
          const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('id, first_name, last_name, phone, role')
            .eq('auth_user_id', user.id)
            .maybeSingle();
            
          if (existingUserError) {
            console.error('Error fetching existing user:', existingUserError);
          }
          
          if (existingUser) {
            userRecord = existingUser as UserRecord;
            setUserId(existingUser.id);
            
            // Pre-fill form fields with existing data
            if (existingUser.first_name) setFirstName(existingUser.first_name);
            if (existingUser.last_name) setLastName(existingUser.last_name);
            if (existingUser.phone) setPhone(existingUser.phone);
            if (existingUser.role) setRole(existingUser.role);
          }
        }
        
        // If we have a user record with a role, fetch the role-specific profile data
        if (userRecord?.id && userRecord?.role) {
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
        // Create new user record (should not happen with the new trigger)
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
      }
      
      // Step 3: Insert base profile
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
      
      const profileId = profileData.id;
      
      // Step 4: Insert role-specific profile
      if (role === 'homeowner') {
        await supabase.from('homeowner_profiles').insert({
          id: profileId,
          preferred_contact_method: preferredContactMethod,
          additional_notes: additionalNotes || null
        });
      } else if (role === 'contractor') {
        await supabase.from('contractor_profiles').insert({
          id: profileId,
          company_name: companyName,
          license_number: licenseNumber || null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          service_area: serviceArea || null,
          insurance_verified: false
        });
      } else if (role === 'adjuster') {
        await supabase.from('adjuster_profiles').insert({
          id: profileId,
          company_name: companyName,
          adjuster_license: licenseNumber || null,
          territories: territories ? territories.split(',').map(t => t.trim()).filter(t => t) : [],
          certification_verified: false
        });
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