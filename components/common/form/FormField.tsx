import React from 'react';

interface FormFieldProps {
  id: string;
  label?: string;
  children: React.ReactNode;
  required?: boolean;
  helpText?: string;
  error?: string;
  className?: string;
}

/**
 * FormField component provides consistent wrapping for form inputs
 * with support for labels, help text, and error messages
 */
const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  children,
  required = false,
  helpText,
  error,
  className = '',
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default FormField;