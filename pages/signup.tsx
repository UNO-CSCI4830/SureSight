import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useRouter } from 'next/router';

// Initialize Supabase client using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type UserRole = 'homeowner' | 'contractor' | 'adjuster';

const SignUp: React.FC = () => {
  const router = useRouter();
  // Basic auth fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // User profile fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [role, setRole] = useState<UserRole>('homeowner');
  
  // Role-specific fields
  const [preferredContactMethod, setPreferredContactMethod] = useState<string>('email');
  const [companyName, setCompanyName] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('');
  const [territories, setTerritories] = useState<string>('');

  // Step tracking for multi-step form
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // UUID utility function (not cryptographically secure, but sufficient for our needs)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate first step
      if (!email || !password || !confirmPassword || !firstName || !lastName) {
        setErrorMessage('Please fill in all required fields.');
        return;
      }
      
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match!');
        return;
      }
  
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long');
        return;
      }
    }
    
    setErrorMessage('');
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setErrorMessage('');
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    
    setIsLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      const userId = authData.user.id;
      const timestamp = new Date().toISOString();

      // 2. Create entry in users table
      const { error: userError } = await supabase.from('users').insert([{
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        created_at: timestamp,
        updated_at: timestamp
      }]);
      
      if (userError) {
        console.error('Error creating user record:', userError);
      }
      
      // 3. Find role ID or create if not exists
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', role)
        .single();
        
      let roleId: string;
      
      if (roleError || !roleData) {
        // Create role if it doesn't exist
        const newRoleId = generateUUID();
        const { error: createRoleError } = await supabase
          .from('roles')
          .insert([{ id: newRoleId, name: role }]);
          
        if (createRoleError) {
          console.error('Error creating role:', createRoleError);
          throw createRoleError;
        }
        
        roleId = newRoleId;
      } else {
        roleId = roleData.id;
      }
      
      // 4. Assign role to user
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert([{
          id: generateUUID(),
          user_id: userId,
          role_id: roleId,
          created_at: timestamp
        }]);
        
      if (userRoleError) {
        console.error('Error assigning role to user:', userRoleError);
      }
      
      // 5. Create profile based on role
      if (role === 'homeowner') {
        const { error: profileError } = await supabase
          .from('homeowner_profiles')
          .insert([{
            id: generateUUID(),
            user_id: userId,
            preferred_contact_method: preferredContactMethod,
            additional_notes: '',
            created_at: timestamp,
            updated_at: timestamp
          }]);
          
        if (profileError) {
          console.error('Error creating homeowner profile:', profileError);
        }
      } else if (role === 'contractor') {
        const { error: profileError } = await supabase
          .from('contractor_profiles')
          .insert([{
            id: generateUUID(),
            user_id: userId,
            company_name: companyName,
            license_number: licenseNumber,
            specialties: ['roofing', 'siding'], // Default specialties
            years_experience: parseInt(yearsExperience) || 0,
            service_area: serviceArea,
            created_at: timestamp,
            updated_at: timestamp
          }]);
          
        if (profileError) {
          console.error('Error creating contractor profile:', profileError);
        }
      } else if (role === 'adjuster') {
        const { error: profileError } = await supabase
          .from('adjuster_profiles')
          .insert([{
            id: generateUUID(),
            user_id: userId,
            company_name: companyName,
            adjuster_license: licenseNumber,
            territories: territories.split(',').map(t => t.trim()),
            created_at: timestamp,
            updated_at: timestamp
          }]);
          
        if (profileError) {
          console.error('Error creating adjuster profile:', profileError);
        }
      }

      // 6. Create entry in generic profiles table for Row Level Security
      const { error: profilesError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: email,
          full_name: `${firstName} ${lastName}`,
          created_at: timestamp
        }]);
        
      if (profilesError) {
        console.error('Error creating profile record:', profilesError);
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Error during sign-up:', err);
      if (err.message.includes('already registered')) {
        setErrorMessage('User already exists. Please use a different email.');
      } else {
        setErrorMessage(err.message || 'An error occurred during signup. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Form Step 1: Basic Information
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="your-email@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="form-input"
            placeholder="John"
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="form-input"
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          placeholder="••••••••"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Must be at least 8 characters
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="confirm-password"
          name="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="form-input"
          placeholder="••••••••"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          I am a <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${role === 'homeowner' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
            onClick={() => setRole('homeowner')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                id="homeowner"
                name="role"
                checked={role === 'homeowner'}
                onChange={() => setRole('homeowner')}
                className="mr-2"
              />
              <label htmlFor="homeowner" className="cursor-pointer">Homeowner</label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Looking for damage assessment for my property</p>
          </div>
          
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${role === 'contractor' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
            onClick={() => setRole('contractor')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                id="contractor"
                name="role"
                checked={role === 'contractor'}
                onChange={() => setRole('contractor')}
                className="mr-2"
              />
              <label htmlFor="contractor" className="cursor-pointer">Contractor</label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Providing repair services for property damage</p>
          </div>
          
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${role === 'adjuster' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
            onClick={() => setRole('adjuster')}
          >
            <div className="flex items-center">
              <input
                type="radio"
                id="adjuster"
                name="role"
                checked={role === 'adjuster'}
                onChange={() => setRole('adjuster')}
                className="mr-2"
              />
              <label htmlFor="adjuster" className="cursor-pointer">Insurance Adjuster</label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Processing insurance claims for property damage</p>
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={nextStep}
          className="btn-primary w-full"
        >
          Next Step
        </button>
      </div>
    </div>
  );

  // Form Step 2: Role-Specific Information
  const renderStep2 = () => {
    // Homeowner specific fields
    if (role === 'homeowner') {
      return (
        <div className="space-y-6">
          <div className="text-center mb-2">
            <p className="font-medium text-primary-500">Homeowner Profile</p>
            <p className="text-sm text-gray-500">Please provide some additional information to complete your profile</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Contact Method
            </label>
            <select
              id="preferredContactMethod"
              name="preferredContactMethod"
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

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={prevStep}
              className="btn-outline"
            >
              Back
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </div>
      );
    } 
    
    // Contractor specific fields
    else if (role === 'contractor') {
      return (
        <div className="space-y-6">
          <div className="text-center mb-2">
            <p className="font-medium text-primary-500">Contractor Profile</p>
            <p className="text-sm text-gray-500">Please provide your business details</p>
          </div>
          
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="form-input"
              placeholder="Your Company LLC"
              required
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

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={prevStep}
              className="btn-outline"
            >
              Back
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </div>
      );
    } 
    
    // Adjuster specific fields
    else if (role === 'adjuster') {
      return (
        <div className="space-y-6">
          <div className="text-center mb-2">
            <p className="font-medium text-primary-500">Insurance Adjuster Profile</p>
            <p className="text-sm text-gray-500">Please provide your professional details</p>
          </div>
          
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="form-input"
              placeholder="e.g. State Farm Insurance"
              required
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

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={prevStep}
              className="btn-outline"
            >
              Back
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Layout title="Sign Up | SureSight" description="Create your SureSight account">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create an Account</h1>
          <p className="text-gray-600 mt-2">Join SureSight to start streamlining your damage assessment process</p>
        </div>
        
        {!isSubmitted ? (
          <div className="card">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Progress indicator */}
            <div className="flex justify-between items-center mb-6">
              <div className={`h-1 flex-1 rounded-full ${currentStep === 1 ? 'bg-primary-500' : 'bg-primary-200'}`}></div>
              <div className={`h-1 flex-1 ml-2 rounded-full ${currentStep === 2 ? 'bg-primary-500' : 'bg-primary-200'}`}></div>
            </div>
            
            <form onSubmit={handleSignUp} className="space-y-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
            </form>
          </div>
        ) : (
          <div className="card text-center py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Email Sent</h2>
            <p className="text-gray-600 mb-6">
              Please check your email to verify your account and complete the registration process.
            </p>
            <Link href="/login" className="btn-primary">
              Go to Login
            </Link>
          </div>
        )}
        
        {!isSubmitted && (
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SignUp;
