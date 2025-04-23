import React from 'react';
import Icon from '../../ui/icons/Icon';

export type MessageType = 'success' | 'error' | 'info' | 'warning';

interface StatusMessageProps {
  text: string;
  type: MessageType;
  className?: string;
  withIcon?: boolean;
  onDismiss?: () => void;
}

/**
 * StatusMessage component provides consistent styling for different types of status messages
 * with support for icons and dismiss functionality
 */
const StatusMessage: React.FC<StatusMessageProps> = ({
  text,
  type,
  className = '',
  withIcon = true,
  onDismiss,
}) => {
  const getMessageClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <div className={`p-4 rounded-md border flex items-start ${getMessageClass()} ${className}`}>
      {withIcon && (
        <span className="flex-shrink-0 mr-2">
          <Icon name={getIconName()} className="h-5 w-5" />
        </span>
      )}
      <div className="flex-grow">{text}</div>
      {onDismiss && (
        <button
          type="button"
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default StatusMessage;