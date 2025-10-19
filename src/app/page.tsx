import { redirect } from 'next/navigation';

/**
 * Root page - Redirects to inventory dashboard
 */

export default function HomePage() {
  redirect('/today');
}
