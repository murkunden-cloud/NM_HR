'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionTracker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;

    let intervalId: NodeJS.Timeout;

    const checkHeartbeat = async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', { method: 'POST' });
        if (res.status === 401) {
          // Session expired or invalid
          router.push('/login');
        }
      } catch (error) {
        console.error('Heartbeat failed', error);
      }
    };

    // Send heartbeat every 30 seconds
    intervalId = setInterval(checkHeartbeat, 30000);

    // Call logout when user closes the tab or navigates away from the app
    const handleBeforeUnload = () => {
      // Use keepalive to ensure the request is sent even as the page unloads
      fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  return null;
}
