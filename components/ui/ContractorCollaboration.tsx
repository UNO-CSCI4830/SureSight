import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Button from './Button';
import Card from '../common/Card';
import ContractorSearch from './ContractorSearch';
import ContractorRequestModal from './ContractorRequestModal';

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

interface ContractorRequest {
  id: string;
  contractor_id: string | null;
  status: string;
  requested_by: string;
  created_at: string;
  response_deadline: string;
  notes: string;
  contractor?: ContractorProfile;
}

interface ContractorCollaborationProps {
  reportId: string;
  status: string; // report status
}

const ContractorCollaboration: React.FC<ContractorCollaborationProps> = ({
  reportId,
  status
}) => {
  const [activeContractor, setActiveContractor] = useState<ContractorProfile | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<ContractorProfile | null>(null);
  const [requests, setRequests] = useState<ContractorRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Load active contractor and pending requests
  useEffect(() => {
    if (reportId) {
      fetchContractorData();
    }
  }, [reportId]);
  
  const fetchContractorData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get contractor assigned to this report (if any)
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          contractor_id,
          contractor:contractor_id(
            *,
            profiles!inner(
              user_id,
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .eq('id', reportId)
        .single();
        
      if (reportError) throw reportError;
      
      if (reportData && reportData.contractor) {
        setActiveContractor(reportData.contractor as unknown as ContractorProfile);
      }
      
      // Get pending contractor requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('contractor_requests')
        .select(`
          *,
          contractor:contractor_id(
            *,
            profiles!inner(
              user_id,
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
        
      if (requestsError) throw requestsError;
      
      if (requestsData) {
        setRequests(requestsData as unknown as ContractorRequest[]);
      }
      
    } catch (err) {
      console.error('Error fetching contractor data:', err);
      setError('Failed to load contractor information');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting a contractor from search results
  const handleSelectContractor = (contractor: ContractorProfile) => {
    setSelectedContractor(contractor);
    setShowModal(true);
    setShowSearch(false);
  };
  
  // Send a request to a contractor
  const handleRequestSubmit = async (requestData: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}/request-contractor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send request');
      }
      
      // Refetch data to update the UI
      await fetchContractorData();
      
      setSuccess('Contractor request sent successfully');
      setShowModal(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (err: any) {
      console.error('Error requesting contractor:', err);
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel a pending request
  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('contractor_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);
        
      if (updateError) throw updateError;
      
      // Refetch data to update the UI
      await fetchContractorData();
      
      setSuccess('Request cancelled successfully');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (err) {
      console.error('Error cancelling request:', err);
      setError('Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };
  
  // Format a date string for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      open: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    const color = statusColors[status] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Render the active contractor section
  const renderActiveContractor = () => {
    if (!activeContractor) {
      return (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">No contractor has been assigned to this report yet.</p>
          {status !== 'draft' && (
            <p className="text-xs text-gray-500">
              The report must be submitted before a contractor can be assigned.
            </p>
          )}
          {status === 'submitted' && (
            <Button
              text="Find a Contractor"
              onClick={() => setShowSearch(true)}
              className="mt-2"
            />
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg border border-green-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center">
              <span className="mr-2 w-3 h-3 bg-green-500 rounded-full"></span>
              <h3 className="font-medium text-lg">
                {activeContractor.profiles.first_name} {activeContractor.profiles.last_name}
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Assigned Contractor</p>
            
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-medium">Email:</span> {activeContractor.profiles.email}</p>
              <p><span className="font-medium">Phone:</span> {activeContractor.profiles.phone || 'Not provided'}</p>
              <p><span className="font-medium">Specialties:</span> {activeContractor.specialties?.join(', ') || 'Not specified'}</p>
              <p>
                <span className="font-medium">Rating:</span> {activeContractor.rating?.toFixed(1) || 'N/A'} 
                {activeContractor.rating_count ? ` (${activeContractor.rating_count} reviews)` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render pending requests
  const renderPendingRequests = () => {
    const pendingRequests = requests.filter(req => ['open', 'assigned'].includes(req.status));
    
    if (pendingRequests.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Requests</h3>
        <div className="space-y-3">
          {pendingRequests.map(request => (
            <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center">
                    {request.contractor ? (
                      <h4 className="font-medium">
                        {request.contractor.profiles.first_name} {request.contractor.profiles.last_name}
                      </h4>
                    ) : (
                      <h4 className="font-medium text-gray-500">Open Request</h4>
                    )}
                    <span className="ml-2">
                      {renderStatusBadge(request.status)}
                    </span>
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-500">
                    <p>Requested on {formatDate(request.created_at)}</p>
                    <p>Deadline: {formatDate(request.response_deadline)}</p>
                  </div>
                  
                  {request.notes && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-700">{request.notes}</p>
                    </div>
                  )}
                </div>
                
                {request.status === 'open' && (
                  <Button
                    text="Cancel"
                    onClick={() => handleCancelRequest(request.id)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Contractor</h2>
          {status === 'submitted' && !activeContractor && !showSearch && (
            <Button
              text="Find a Contractor"
              onClick={() => setShowSearch(true)}
            />
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
            {success}
          </div>
        )}
        
        {loading && !showSearch ? (
          <div className="text-center py-8">Loading contractor information...</div>
        ) : showSearch ? (
          <ContractorSearch 
            reportId={reportId}
            onSelectContractor={handleSelectContractor}
          />
        ) : (
          <>
            {renderActiveContractor()}
            {renderPendingRequests()}
          </>
        )}
      </div>
      
      {/* Contractor request modal */}
      <ContractorRequestModal
        reportId={reportId}
        contractor={selectedContractor}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRequestSubmit={handleRequestSubmit}
      />
    </Card>
  );
};

export default ContractorCollaboration;