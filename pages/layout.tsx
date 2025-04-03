import * as React from 'react';
import '../styles/globals.css'; // Fixed import path

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  
  const metadata = {
    title: 'SureSight',
    description: 'Streamline roofing and siding damage assessment',
  };

  return React.createElement(
    'html',
    { lang: 'en' },
    React.createElement('head', null,
      React.createElement('title', null, metadata.title),
      React.createElement('meta', { name: 'description', content: metadata.description }),
    ),
    React.createElement('body', null, children)
  );
}
