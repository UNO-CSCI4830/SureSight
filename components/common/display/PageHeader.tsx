import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  actions?: React.ReactNode;
}

/**
 * PageHeader component provides consistent page header styling across the application
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  className = '',
  actions,
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h1>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
        {actions && <div className="mt-4 md:mt-0 md:ml-6">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;