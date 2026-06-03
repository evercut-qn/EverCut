/**
 * Layout container for authentication views.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="relative w-full max-w-md bg-card border border-border rounded-lg p-6 sm:p-8 shadow-2xl text-card-foreground">
        {children}
      </div>
    </div>
  );
}
export { metadata } from '../layout';
