import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Button from './Button';
import FormInput from './FormInput';
import Select from './Select';
import Card from '../common/Card';

interface Collaborator {
  id: string;
  user_id: string;
  report_id: string;
  role_type: string;
  permission_level: string;
  invited_by: string;
  invitation_status: string;
  invitation_email?: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
      role: string;
    };
  };
}

interface CollaboratorManagementProps {
  reportId: string;
  isReportOwner: boolean;
}

const CollaboratorManagement: React.FC<CollaboratorManagementProps> = ({
  reportId,
  isReportOwner
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [form, setForm] = useState({
    email: '',
    roleType: 'viewer',
    permissionLevel: 'viewer'
  });

  // Role options for the selector
  const roleOptions = [
    { value: 'homeowner', label: 'Homeowner' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'adjuster', label: 'Adjuster' },
    { value: 'viewer', label: 'Viewer' }
  ];

  // Permission level options for the selector
  const permissionOptions = [
    { value: 'viewer', label: 'Viewer (Read-only)' },
    { value: 'editor', label: 'Editor (Can make changes)' },
    { value: 'manager', label: 'Manager (Full control)' }
  ];

  // Fetch collaborators when component mounts
  useEffect(() => {
    if (reportId) {
      fetchCollaborators();
    }
  }, [reportId]);

  // Fetch collaborators from the API
  const fetchCollaborators = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}/collaborators`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }
      
      const data = await response.json();
      setCollaborators(data.collaborators || []);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
      setError('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  // Handle input change in the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a new collaborator
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          roleType: form.roleType,
          permissionLevel: form.permissionLevel
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add collaborator');
      }
      
      // Reset form and fetch updated collaborator list
      setForm({
        email: '',
        roleType: 'viewer',
        permissionLevel: 'viewer'
      });
      
      setIsAddingCollaborator(false);
      setSuccess('Collaborator invitation sent successfully');
      fetchCollaborators();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (err: any) {
      console.error('Error adding collaborator:', err);
      setError(err.message || 'Failed to add collaborator');
    } finally {
      setLoading(false);
    }
  };

  // Remove a collaborator
  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}/collaborators/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove collaborator');
      }
      
      setSuccess('Collaborator removed successfully');
      fetchCollaborators();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (err: any) {
      console.error('Error removing collaborator:', err);
      setError(err.message || 'Failed to remove collaborator');
    } finally {
      setLoading(false);
    }
  };

  // Update collaborator permissions
  const handleUpdatePermission = async (userId: string, newPermission: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}/collaborators/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissionLevel: newPermission
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update permissions');
      }
      
      setSuccess('Permissions updated successfully');
      fetchCollaborators();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (err: any) {
      console.error('Error updating permissions:', err);
      setError(err.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  // Format invitation status with appropriate styling
  const renderInvitationStatus = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800'
    };
    
    const color = statusColors[status] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Render the add collaborator form
  const renderAddCollaboratorForm = () => {
    return (
      <form onSubmit={handleAddCollaborator} className="space-y-4">
        <FormInput
          id="email"
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleInputChange}
          placeholder="Enter the collaborator's email"
          required
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <Select
              id="roleType"
              name="roleType"
              value={form.roleType}
              onChange={handleInputChange}
              options={roleOptions}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permission Level
            </label>
            <Select
              id="permissionLevel"
              name="permissionLevel"
              value={form.permissionLevel}
              onChange={handleInputChange}
              options={permissionOptions}
            />
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => setIsAddingCollaborator(false)}
            className="mr-2 bg-gray-100 hover:bg-gray-200 text-gray-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            Add Collaborator
          </Button>
        </div>
      </form>
    );
  };

  // Render the collaborator list
  const renderCollaboratorList = () => {
    if (collaborators.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-gray-500">No collaborators have been added to this report yet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {collaborators.map(collaborator => (
          <div key={collaborator.id} className="bg-white border rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                {collaborator.user ? (
                  <div className="flex items-center">
                    {collaborator.user.profiles?.avatar_url && (
                      <img 
                        src={collaborator.user.profiles.avatar_url} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    )}
                    <div>
                      <h3 className="font-medium">
                        {collaborator.user.profiles?.first_name || ''} {collaborator.user.profiles?.last_name || ''}
                      </h3>
                      <p className="text-sm text-gray-500">{collaborator.user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600">
                      {collaborator.invitation_email}
                    </p>
                    <p className="text-xs text-gray-500">Invite pending</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">
                  {renderInvitationStatus(collaborator.invitation_status)}
                </span>
                
                <span className="text-sm text-gray-600 mr-2">
                  {collaborator.role_type.charAt(0).toUpperCase() + collaborator.role_type.slice(1)}
                </span>
                
                {isReportOwner && collaborator.invitation_status === 'accepted' && (
                  <Select
                    id={`permission-${collaborator.user_id}`}
                    className="text-xs mr-2"
                    value={collaborator.permission_level}
                    onChange={(e) => handleUpdatePermission(collaborator.user_id, e.target.value)}
                    options={[
                      { value: 'viewer', label: 'Viewer' },
                      { value: 'editor', label: 'Editor' },
                      { value: 'manager', label: 'Manager' }
                    ]}
                  />
                )}
                
                {isReportOwner && (
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator.user_id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Collaborators</h2>
          {isReportOwner && !isAddingCollaborator && (
            <Button
              onClick={() => setIsAddingCollaborator(true)}
            >
              Add Collaborator
            </Button>
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
        
        {isAddingCollaborator ? (
          renderAddCollaboratorForm()
        ) : loading ? (
          <div className="text-center py-8">Loading collaborators...</div>
        ) : (
          renderCollaboratorList()
        )}
      </div>
    </Card>
  );
};

export default CollaboratorManagement;