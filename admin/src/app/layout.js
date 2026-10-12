import { Inter, Outfit } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-display',
  subsets: ['latin'],
});

/** @type {import('next').Metadata} */
export const metadata = {
  title: 'Evercut — Smart Salon & Grooming Booking Platform | evercut.in',
  description: 'Evercut is now available on Google Play Store! Book appointments at top salons, pick your stylist, book exact 5-minute time slots, and skip the queue.',
  appleWebApp: {
    title: 'Evercut',
  },
};

/**
 * Root Layout wrapping the HTML lifecycle.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
