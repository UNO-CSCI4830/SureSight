
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd7ff',
          300: '#8cbeff',
          400: '#5499ff',
          500: '#3378ff',  // Primary brand color
          600: '#1a5ff7',
          700: '#1347e6',
          800: '#173abb',
          900: '#193694',
          950: '#142158',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e5fe',
          300: '#7cd1fd',
          400: '#36b8fb',
          500: '#0da2e7',  // Secondary brand color (previously #00a3ee)
          600: '#0080c4',
          700: '#0167a0',
          800: '#065785',
          900: '#0a496f',
          950: '#072e47',
        },
      },
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
        display: ['Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 8px rgba(0, 0, 0, 0.1)',
        hover: '0 8px 16px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'xl': '0.75rem',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ["night"], 
  },
}
