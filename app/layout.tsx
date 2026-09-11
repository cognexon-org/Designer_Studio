import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProgressionAi Project Studio',
  description: 'Unified reality capture, spatial history, design and comparison workspace for ProgressionAi.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
