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
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#18181b',       /* zinc-900 */
              color: '#f4f4f5',            /* zinc-100 */
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-montserrat), sans-serif',
              padding: '10px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset',
              backdropFilter: 'blur(12px)',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',        /* green-400 */
                secondary: '#18181b',
              },
            },
            error: {
              iconTheme: {
                primary: '#f87171',        /* red-400 */
                secondary: '#18181b',
              },
            },
            loading: {
              iconTheme: {
                primary: '#a1a1aa',        /* zinc-400 */
                secondary: '#18181b',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
