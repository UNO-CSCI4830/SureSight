import React, { useState } from 'react';
import Button from './Button';
import TextArea from './TextArea';

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

interface ContractorRequestModalProps {
  reportId: string;
  contractor: ContractorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmit: (requestData: any) => Promise<void>;
}

const ContractorRequestModal: React.FC<ContractorRequestModalProps> = ({
  reportId,
  contractor,
  isOpen,
  onClose,
  onRequestSubmit
}) => {
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Calculate a default deadline 7 days from now
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };
  
  // Reset form when modal opens with a new contractor
  React.useEffect(() => {
    if (isOpen && contractor) {
      setNotes('');
      setDeadline(getDefaultDeadline());
      setError('');
    }
  }, [isOpen, contractor]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractor) {
      setError('No contractor selected');
      return;
    }
    
    if (!deadline) {
      setError('Please set a response deadline');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await onRequestSubmit({
        contractorId: contractor.id,
        notes,
        responseDeadline: new Date(deadline).toISOString()
      });
      
      onClose();
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen || !contractor) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Request Contractor</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium">
              {contractor.profiles.first_name} {contractor.profiles.last_name}
            </h3>
            <div className="text-sm text-gray-600 mt-1">
              <div>
                <span className="font-medium">Specialties:</span>{' '}
                {contractor.specialties.join(', ')}
              </div>
              <div className="mt-1">
                <span className="font-medium">Rating:</span>{' '}
                {contractor.rating.toFixed(1)} / 5.0 ({contractor.rating_count} reviews)
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Date by which you need the contractor to respond
            </p>
          </div>
          
          <div className="mb-6">
            <TextArea
              label="Notes to Contractor"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide any specific details about the project or requirements"
              rows={4}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              text="Cancel"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            />
            <Button
              text="Send Request"
              type="submit"
              loading={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractorRequestModal;