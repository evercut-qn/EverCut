'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

/**
 * Root context providers wrapper. Sets up theme support and global toaster elements.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Sub-tree child elements
 */
export function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        theme="system" 
      />
    </ThemeProvider>
  );
}
export default Providers;
