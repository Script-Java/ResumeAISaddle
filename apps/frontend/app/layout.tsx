import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './(default)/css/globals.css';

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Recro AI',
  description: 'Build your resume with Recro AI',
  applicationName: 'Recro AI',
  keywords: ['resume', 'matcher', 'job', 'application'],
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className="h-full" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} font-sans antialiased bg-background text-ink-soft min-h-full`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
