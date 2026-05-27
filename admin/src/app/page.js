import { redirect } from 'next/navigation';

/**
 * Root route redirecting to the administrative Operations Overview.
 * Navigation guards (proxy.js) will handle session check/login redirect.
 */
export default function Home() {
  redirect('/overview');
}
