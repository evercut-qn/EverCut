import { Suspense } from 'react';
import { LoginForm } from './_components/LoginForm';

/**
 * Metadata configuration for public login screen.
 */
export const metadata = {
  title: 'EverCut Admin — Login Access',
  description: 'Authentication entry page for the EverCut administration controls panel.',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading security checks...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
