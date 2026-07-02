import { redirect } from 'next/navigation';

export default function Home() {
  // Immediately redirect to login, skipping the extra welcome screen.
  redirect('/login');
}
