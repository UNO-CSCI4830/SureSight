import React, { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { Card, StatusMessage, LoadingSpinner } from '../components/common';
import { FormInput, Select, Button } from '../components/ui';
import { UserRole } from '../types/supabase';

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
      
      // Parse territories into an array if role is adjuster
      const territoriesArray = role === 'adjuster' 
        ? territories.split(',').map(t => t.trim()).filter(t => t) 
        : undefined;

      // For contractors, we can specify specialties if needed
      const specialtiesArray = role === 'contractor' ? ['roofing', 'siding'] : undefined;
      
      // 2. Use the create_user_profile function from the new schema
      const { data, error } = await supabase.rpc('create_user_profile', {
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_role: role,
        p_auth_user_id: userId,
        p_avatar_url: undefined,
        p_phone: undefined, // We could collect phone on signup if needed
        p_preferred_contact_method: role === 'homeowner' ? preferredContactMethod : undefined,
        p_additional_notes: role === 'homeowner' ? undefined : undefined,
        p_company_name: (role === 'contractor' || role === 'adjuster') ? companyName : undefined,
        p_license_number: role === 'contractor' ? licenseNumber : undefined,
        p_specialties: specialtiesArray,
        p_years_experience: role === 'contractor' ? (parseInt(yearsExperience) || undefined) : undefined,
        p_service_area: role === 'contractor' ? serviceArea : undefined,
        p_insurance_verified: false, // Default value, admin can update later
        p_adjuster_license: role === 'adjuster' ? licenseNumber : undefined,
        p_territories: territoriesArray,
        p_certification_verified: false // Default value, admin can update later
      });
      
      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }

      console.log('Profile creation result:', data);
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
        <FormInput
          label="Email Address"
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your-email@example.com"
          inputClassName="bg-white text-gray-900"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormInput
            label="First Name"
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            inputClassName="bg-white text-gray-900"
            required
          />
        </div>
        <div>
          <FormInput
            label="Last Name"
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            inputClassName="bg-white text-gray-900"
            required
          />
        </div>
      </div>

      <div>
        <FormInput
          label="Password"
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          inputClassName="bg-white text-gray-900"
          required
          helpText="Must be at least 8 characters"
        />
      </div>

      <div>
        <FormInput
          label="Confirm Password"
          type="password"
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          inputClassName="bg-white text-gray-900"
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
        <Button
          type="button"
          onClick={nextStep}
          className="btn-primary w-full"
        >
          Next Step
        </Button>
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
            <Select
              label="Preferred Contact Method"
              id="preferredContactMethod"
              value={preferredContactMethod}
              onChange={(e) => setPreferredContactMethod(e.target.value)}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'phone', label: 'Phone' },
                { value: 'sms', label: 'Text Message' }
              ]}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              onClick={prevStep}
              className="btn-outline"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={`btn-primary ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <LoadingSpinner text="Creating account..." />
              ) : (
                'Create Account'
              )}
            </Button>
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
            <FormInput
              label="Company Name"
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company LLC"
              inputClassName="bg-white text-gray-900"
              required
            />
          </div>
          
          <div>
            <FormInput
              label="License Number"
              type="text"
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. CON-12345"
              inputClassName="bg-white text-gray-900"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormInput
                label="Years of Experience"
                type="number"
                id="yearsExperience"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="5"
                inputClassName="bg-white text-gray-900"
                min="0"
              />
            </div>
            <div>
              <FormInput
                label="Service Area"
                type="text"
                id="serviceArea"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="e.g. Omaha Metro Area"
                inputClassName="bg-white text-gray-900"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              onClick={prevStep}
              className="btn-outline"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={`btn-primary ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <LoadingSpinner text="Creating account..." />
              ) : (
                'Create Account'
              )}
            </Button>
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
            <FormInput
              label="Insurance Company"
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. State Farm Insurance"
              inputClassName="bg-white text-gray-900"
              required
            />
          </div>
          
          <div>
            <FormInput
              label="Adjuster License Number"
              type="text"
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. ADJ-12345"
              inputClassName="bg-white text-gray-900"
            />
          </div>
          
          <div>
            <FormInput
              label="Territories"
              type="text"
              id="territories"
              value={territories}
              onChange={(e) => setTerritories(e.target.value)}
              placeholder="e.g. Nebraska, Iowa, Kansas"
              helpText="Comma separated list of territories you cover"
              inputClassName="bg-white text-gray-900"
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              onClick={prevStep}
              className="btn-outline"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={`btn-primary ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <LoadingSpinner text="Creating account..." />
              ) : (
                'Create Account'
              )}
            </Button>
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
          <Card>
            {errorMessage && (
              <StatusMessage type="error" text={errorMessage} className="mb-4" />
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
          </Card>
        ) : (
          <Card className="text-center py-10">
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
          </Card>
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
