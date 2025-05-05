import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Button from './Button';
import FormInput from './FormInput';
import Select from './Select';
import { JSX } from 'react';

interface ContractorProfile {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  specialties: string[];
  service_areas: string[];
  availability_status: string;
  rating: number;
  rating_count: number;
  search_radius: number;
}

interface ContractorSearchProps {
  reportId?: string;
  onSelectContractor: (contractor: ContractorProfile) => void;
}

const ContractorSearch = ({ reportId, onSelectContractor }: ContractorSearchProps) => {
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    location: '',
    specialties: '' as string | string[],
    minRating: '0',
    radius: '25'
  });
  const [reportSpecificContractors, setReportSpecificContractors] = useState<ContractorProfile[]>([]);
  const [activeTab, setActiveTab] = useState('recommended');

  // Specialties options for filtering
  const specialtiesOptions = [
    { value: 'roof', label: 'Roof' },
    { value: 'siding', label: 'Siding' },
    { value: 'window', label: 'Window' },
    { value: 'structural', label: 'Structural' },
    { value: 'water', label: 'Water Damage' },
    { value: 'other', label: 'Other' }
  ];

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle multi-select changes
  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setSearchParams(prev => ({
      ...prev,
      specialties: options
    }));
  };

  // Generic search for contractors
  const searchContractors = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (searchParams.location) {
        queryParams.append('location', searchParams.location);
      }
      
      if (searchParams.specialties) {
        if (Array.isArray(searchParams.specialties)) {
          searchParams.specialties.forEach(specialty => {
            queryParams.append('specialties', specialty);
          });
        } else {
          queryParams.append('specialties', searchParams.specialties);
        }
      }
      
      queryParams.append('minRating', searchParams.minRating);
      queryParams.append('radius', searchParams.radius);
      
      const response = await fetch(`/api/contractors?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data && data.contractors) {
        setContractors(data.contractors);
      }
    } catch (error) {
      console.error('Error searching contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get recommended contractors for specific report
  const getReportContractors = async () => {
    if (!reportId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/available-contractors`);
      const data = await response.json();
      
      if (data && data.contractors) {
        setReportSpecificContractors(data.contractors);
      }
    } catch (error) {
      console.error('Error getting report contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with recommended contractors if we have a reportId
  useEffect(() => {
    if (reportId) {
      getReportContractors();
    }
  }, [reportId]);

  // Display a contractor's rating as stars
  const renderRating = (rating: number) => {
    const stars: JSX.Element[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`text-lg ${i <= rating ? 'text-yellow-500' : 'text-gray-300'}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Find Contractors</h2>
      
      {reportId && (
        <div className="mb-4">
          <div className="flex border-b">
            <button
              className={`py-2 px-4 ${activeTab === 'recommended' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
              onClick={() => setActiveTab('recommended')}
            >
              Recommended
            </button>
            <button
              className={`py-2 px-4 ${activeTab === 'search' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
              onClick={() => setActiveTab('search')}
            >
              Search All
            </button>
          </div>
        </div>
      )}
      
      {(!reportId || activeTab === 'search') && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              id="location"
              label="Location"
              name="location"
              type="text"
              value={searchParams.location}
              onChange={handleInputChange}
              placeholder="City, State or Zip"
            />
            
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialties
              </label>
              <select
                name="specialties"
                multiple
                className="border border-gray-300 rounded px-3 py-2 w-full"
                onChange={handleSpecialtiesChange}
                value={Array.isArray(searchParams.specialties) ? searchParams.specialties : [searchParams.specialties].filter(Boolean)}
                aria-label="Specialties"
              >
                {specialtiesOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl or Cmd to select multiple</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
                        id="minRating"
                        label="Minimum Rating"
                        name="minRating"
                        type="number"
                        min="0"
                        max="5"
                        // @ts-ignore - add step to FormInputProps interface if needed frequently
                        step="0.5"
                        value={searchParams.minRating}
                        onChange={handleInputChange}
                      />
            
            <FormInput
              id="radius"
              label="Search Radius (miles)"
              name="radius"
              type="number"
              min="5"
              max="100"
              value={searchParams.radius}
              onChange={handleInputChange}
            />
          </div>
          
          <Button 
            onClick={searchContractors}
            isLoading={loading}
            className="w-full"
          >
            Search Contractors
          </Button>
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">
          {activeTab === 'recommended' && reportId ? 'Recommended Contractors' : 'Search Results'}
        </h3>
        
        {loading ? (
          <div className="py-4 text-center">Loading contractors...</div>
        ) : (
          <div className="space-y-4">
            {(activeTab === 'recommended' && reportId ? reportSpecificContractors : contractors).length > 0 ? (
              (activeTab === 'recommended' && reportId ? reportSpecificContractors : contractors).map(contractor => (
                <div key={contractor.id} className="border rounded-md p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium">
                        {contractor.profiles.first_name} {contractor.profiles.last_name}
                      </h4>
                      <div className="mt-1 flex items-center">
                        {renderRating(contractor.rating)}
                        <span className="ml-2 text-sm text-gray-500">
                          ({contractor.rating_count} reviews)
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Specialties:</span>{' '}
                          {contractor.specialties.join(', ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Service Areas:</span>{' '}
                          {contractor.service_areas.join(', ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => onSelectContractor(contractor)}
                      className="text-sm"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                {activeTab === 'recommended' && reportId 
                  ? "No recommended contractors found for this report yet. Try searching all contractors."
                  : "No contractors found matching your search criteria."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractorSearch;