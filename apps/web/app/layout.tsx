import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NavigationHeader } from '../components/NavigationHeader';
import { StatusBanner } from '../components/StatusBanner';
import { ThemeProvider } from '../lib/theme';
import React from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BeBrahma - AI-Powered Virtual Co-Founder',
  description: 'Your AI-powered virtual co-founder for business research, validation, and strategy.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <NavigationHeader />
          <StatusBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// DockMount component moved to a separate client component file
