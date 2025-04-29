import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import { supabase, handleSupabaseError } from '../utils/supabaseClient';
import { PageHeader, Card, LoadingSpinner, StatusMessage } from '../components/common';
import { FormInput, Select, TextArea } from '../components/ui';
import { Property } from '../types/supabase';

type PropertyFormData = {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  property_type: string;
  square_footage: string;
  year_built: string;
};

const PropertiesPage: React.FC = () => {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showMessageTimeout, setShowMessageTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<PropertyFormData>({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    property_type: 'residential',
    square_footage: '',
    year_built: '',
  });
  
  const propertyTypes = [
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'multi-family', label: 'Multi-Family' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'land', label: 'Land' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchProperties();
    
    // Clear any existing message timeout when component unmounts
    return () => {
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
    };
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      // First, get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Get the user ID
      const userId = session.user.id;
      
      // Get the user's profile ID from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', userId)
        .single();
      
      if (userError) {
        throw userError;
      }
      
      // Get the homeowner profile ID for the user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      const { data: homeownerData, error: homeownerError } = await supabase
        .from('homeowner_profiles')
        .select('id')
        .eq('id', profileData.id)
        .single();
        
      if (homeownerError) {
        // If the user is not a homeowner, show an appropriate message
        setMessage({
          text: 'Only homeowner accounts can manage properties. Please update your profile to homeowner type.',
          type: 'info'
        });
        setProperties([]);
        setIsLoading(false);
        return;
      }
      
      // Now fetch properties for this homeowner
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('homeowner_id', homeownerData.id)
        .order('created_at', { ascending: false });
        
      if (propertiesError) {
        throw propertiesError;
      }
      
      setProperties(propertiesData || []);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to load properties: ${errorDetails.message}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const resetForm = () => {
    setFormData({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      country: 'USA',
      postal_code: '',
      property_type: 'residential',
      square_footage: '',
      year_built: '',
    });
    setSelectedProperty(null);
    setIsAdding(false);
    setIsEditing(false);
  };
  
  const fillFormWithProperty = (property: Property) => {
    setFormData({
      address_line1: property.address_line1 || '',
      address_line2: property.address_line2 || '',
      city: property.city || '',
      state: property.state || '',
      country: property.country || 'USA',
      postal_code: property.postal_code || '',
      property_type: property.property_type || 'residential',
      square_footage: property.square_footage ? String(property.square_footage) : '',
      year_built: property.year_built ? String(property.year_built) : '',
    });
    
    setSelectedProperty(property);
  };
  
  const handleEditProperty = (property: Property) => {
    fillFormWithProperty(property);
    setIsEditing(true);
    setIsAdding(false);
  };
  
  const handleAddProperty = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
  };
  
  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if property has any reports
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('id')
        .eq('property_id', propertyId)
        .limit(1);
        
      if (reportsError) {
        throw reportsError;
      }
      
      if (reports && reports.length > 0) {
        throw new Error('Cannot delete property with existing reports. Please delete the reports first.');
      }
      
      // Delete the property
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);
        
      if (deleteError) {
        throw deleteError;
      }
      
      // Show success message
      setMessage({
        text: 'Property deleted successfully',
        type: 'success'
      });
      
      // Refresh the list of properties
      await fetchProperties();
      
      // Clear any existing message timeout
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
      
      // Set a new timeout to clear the message after 5 seconds
      const timeout = setTimeout(() => {
        setMessage(null);
      }, 5000);
      
      setShowMessageTimeout(timeout);
    } catch (error: any) {
      console.error('Error deleting property:', error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to delete property: ${errorDetails.message}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    resetForm();
  };
  
  const validateForm = () => {
    const requiredFields = ['address_line1', 'city', 'state', 'postal_code'];
    let isValid = true;
    
    for (const field of requiredFields) {
      if (!formData[field as keyof PropertyFormData]) {
        isValid = false;
        setMessage({
          text: `${field.replace('_', ' ')} is required`,
          type: 'error'
        });
        break;
      }
    }
    
    // Validate postal code format for US
    if (formData.country === 'USA' && !/^\d{5}(-\d{4})?$/.test(formData.postal_code)) {
      isValid = false;
      setMessage({
        text: 'Invalid postal code format. Please use 5-digit or 5+4 format (e.g., 12345 or 12345-6789)',
        type: 'error'
      });
    }
    
    // Validate square footage if provided
    if (formData.square_footage && isNaN(Number(formData.square_footage))) {
      isValid = false;
      setMessage({
        text: 'Square footage must be a number',
        type: 'error'
      });
    }
    
    // Validate year built if provided
    if (formData.year_built) {
      const year = Number(formData.year_built);
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
        isValid = false;
        setMessage({
          text: `Year built must be between 1800 and ${new Date().getFullYear()}`,
          type: 'error'
        });
      }
    }
    
    return isValid;
  };
  
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the user's auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Get the user ID
      const userId = session.user.id;
      
      // Get the user's profile ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', userId)
        .single();
      
      if (userError) {
        throw userError;
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      const { data: homeownerData, error: homeownerError } = await supabase
        .from('homeowner_profiles')
        .select('id')
        .eq('id', profileData.id)
        .single();
        
      if (homeownerError) {
        throw new Error('User is not a homeowner. Please update your profile to homeowner type.');
      }
      
      // Prepare the property data
      const propertyData = {
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || null,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postal_code,
        property_type: formData.property_type || null,
        square_footage: formData.square_footage ? Number(formData.square_footage) : null,
        year_built: formData.year_built ? Number(formData.year_built) : null,
        homeowner_id: homeownerData.id
      };
      
      if (isEditing && selectedProperty) {
        // Update existing property
        const { data, error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', selectedProperty.id)
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        setMessage({
          text: 'Property updated successfully',
          type: 'success'
        });
      } else if (isAdding) {
        // Create new property
        const { data, error } = await supabase
          .from('properties')
          .insert(propertyData)
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        setMessage({
          text: 'Property added successfully',
          type: 'success'
        });
        
        // Update the property count in homeowner profile
        const { data: countData } = await supabase
          .from('properties')
          .select('id')
          .eq('homeowner_id', homeownerData.id);
          
        if (countData) {
          await supabase
            .from('homeowner_profiles')
            .update({ property_count: countData.length })
            .eq('id', homeownerData.id)
            .select();
        }
      }
      
      // Reset the form and fetch updated properties
      resetForm();
      await fetchProperties();
      
      // Clear any existing message timeout
      if (showMessageTimeout) {
        clearTimeout(showMessageTimeout);
      }
      
      // Set a new timeout to clear the message after 5 seconds
      const timeout = setTimeout(() => {
        setMessage(null);
      }, 5000);
      
      setShowMessageTimeout(timeout);
    } catch (error: any) {
      console.error('Error saving property:', error);
      const errorDetails = handleSupabaseError(error);
      setMessage({
        text: `Failed to save property: ${errorDetails.message}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderPropertyForm = () => {
    return (
      <form onSubmit={handleSubmitForm} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormInput
              id="address_line1"
              name="address_line1"
              label="Street Address"
              value={formData.address_line1}
              onChange={handleInputChange}
              placeholder="123 Main St"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <FormInput
              id="address_line2"
              name="address_line2"
              label="Address Line 2"
              value={formData.address_line2}
              onChange={handleInputChange}
              placeholder="Apartment, suite, unit, building, floor, etc."
            />
          </div>
          
          <FormInput
            id="city"
            name="city"
            label="City"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="City"
            required
          />
          
          <FormInput
            id="state"
            name="state"
            label="State/Province"
            value={formData.state}
            onChange={handleInputChange}
            placeholder="State"
            required
          />
          
          <FormInput
            id="postal_code"
            name="postal_code"
            label="ZIP/Postal Code"
            value={formData.postal_code}
            onChange={handleInputChange}
            placeholder="12345"
            required
          />
          
          <FormInput
            id="country"
            name="country"
            label="Country"
            value={formData.country}
            onChange={handleInputChange}
            placeholder="USA"
            required
          />
          
          <div>
            <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <Select
              id="property_type"
              name="property_type"
              value={formData.property_type}
              onChange={handleInputChange}
              options={propertyTypes}
            />
          </div>
          
          <FormInput
            id="square_footage"
            name="square_footage"
            label="Square Footage"
            type="number"
            value={formData.square_footage}
            onChange={handleInputChange}
            placeholder="0"
            min="0"
          />
          
          <FormInput
            id="year_built"
            name="year_built"
            label="Year Built"
            type="number"
            value={formData.year_built}
            onChange={handleInputChange}
            placeholder="2000"
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>
        
        <div className="flex justify-between pt-4">
          <button 
            type="button" 
            onClick={handleCancel} 
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
            ) : isEditing ? 'Update Property' : 'Add Property'}
          </button>
        </div>
      </form>
    );
  };
  
  const renderPropertyCard = (property: Property) => {
    return (
      <Card key={property.id} className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-1">{property.address_line1}</h3>
            {property.address_line2 && <p className="text-gray-600">{property.address_line2}</p>}
            <p className="text-gray-600">
              {property.city}, {property.state} {property.postal_code}
            </p>
            <p className="text-gray-600">{property.country}</p>
            
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {property.property_type && (
                <div>
                  <span className="font-medium">Type:</span>{' '}
                  <span className="capitalize">{property.property_type}</span>
                </div>
              )}
              
              {property.square_footage && (
                <div>
                  <span className="font-medium">Size:</span>{' '}
                  <span>{property.square_footage} sq ft</span>
                </div>
              )}
              
              {property.year_built && (
                <div>
                  <span className="font-medium">Year Built:</span>{' '}
                  <span>{property.year_built}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditProperty(property)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteProperty(property.id)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Layout title="My Properties | SureSight">
      <AuthGuard>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <PageHeader title="My Properties" subtitle="Manage your registered properties" />
              
              {!isAdding && !isEditing && (
                <button
                  onClick={handleAddProperty}
                  className="btn-primary"
                >
                  Add New Property
                </button>
              )}
            </div>
            
            {message && (
              <StatusMessage
                type={message.type}
                text={message.text}
                className="mb-6"
                onDismiss={() => setMessage(null)}
              />
            )}
            
            {isLoading && !isEditing && !isAdding ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="md" text="Loading properties..." />
              </div>
            ) : isEditing || isAdding ? (
              <Card>
                <h2 className="text-xl font-bold mb-4">
                  {isEditing ? 'Edit Property' : 'Add New Property'}
                </h2>
                {renderPropertyForm()}
              </Card>
            ) : properties.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <h3 className="text-lg font-medium text-gray-500 mb-4">No properties found</h3>
                  <p className="mb-6 text-gray-500">
                    You haven't added any properties yet. Add your property to create damage reports.
                  </p>
                  <button
                    onClick={handleAddProperty}
                    className="btn-primary"
                  >
                    Add Your First Property
                  </button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {properties.map(property => renderPropertyCard(property))}
              </div>
            )}
          </div>
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default PropertiesPage;