declare module 'flowbite-react' {
  import * as React from 'react';
  
  // Badge component
  export interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
    color?: 'blue' | 'red' | 'green' | 'yellow' | 'indigo' | 'purple' | 'pink' | 'dark' | 'light' | 'success' | 'failure' | 'warning' | 'info';
    href?: string;
    size?: 'xs' | 'sm';
  }

  export const Badge: React.FC<BadgeProps>;

  // Add other components as needed
}