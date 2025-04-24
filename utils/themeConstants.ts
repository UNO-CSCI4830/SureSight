/**
 * Theme Constants for SureSight Application
 * 
 * This file contains shared theme values used across the application.
 * Centralizing these values makes it easier to maintain consistent styling.
 */

export const COLORS = {
  primary: {
    light: '#5499ff',
    main: '#3378ff',
    dark: '#1a5ff7',
  },
  secondary: {
    light: '#36b8fb',
    main: '#0da2e7',
    dark: '#0080c4',
  },
  error: {
    light: '#f88e86',
    main: '#ef5350',
    dark: '#d32f2f',
  },
  warning: {
    light: '#ffb74d',
    main: '#ff9800',
    dark: '#f57c00',
  },
  success: {
    light: '#81c784',
    main: '#4caf50',
    dark: '#388e3c',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

export const SHADOWS = {
  card: '0 4px 8px rgba(0, 0, 0, 0.1)',
  hover: '0 8px 16px rgba(0, 0, 0, 0.1)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

export const FONTS = {
  primary: 'Arial, sans-serif',
  display: 'Tahoma, Geneva, Verdana, sans-serif',
};

export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem',  // 8px
  md: '1rem',    // 16px
  lg: '1.5rem',  // 24px
  xl: '2rem',    // 32px
  '2xl': '3rem', // 48px
};

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export default {
  COLORS,
  SHADOWS,
  FONTS,
  SPACING,
  BREAKPOINTS,
};