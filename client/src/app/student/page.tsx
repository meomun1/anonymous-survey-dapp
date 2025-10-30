'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now redirects to /login/student
// The actual student portal is for authenticated users only
export default function StudentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new student login page
    router.push('/login/student');
  }, [router]);

  return null;
}
