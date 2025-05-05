import React from 'react';

interface TextAreaProps {
  id: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: number;
  error?: string;
  helpText?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onKeyDown,
  placeholder = '',
  required = false,
  disabled = false,
  className = '',
  rows = 3,
  error,
  helpText
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={id}
        name={name || id}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`form-input ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
      />
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default TextArea;