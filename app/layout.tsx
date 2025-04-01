import * as React from 'react';
import 'globals.css';

export const metadata = {
  title: 'SureSight',
  description: 'Streamline roofing and siding damage assessment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return React.createElement(
    'html',
    { lang: 'en' },
    React.createElement('body', null, children)
  );
}
