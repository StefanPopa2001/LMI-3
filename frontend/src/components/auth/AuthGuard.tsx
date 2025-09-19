"use client";
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import authService from '../../services/authService';
import LoadingOverlay from '@/ui/feedback/LoadingOverlay';
import { useToast } from '../ui/ToastManager';

// Public (unauthenticated) routes allowed
const PUBLIC_ROUTES = new Set<string>(['/login']);

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { error: showError } = useToast();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const enforceAuth = () => {
      const isAuthed = authService.isAuthenticated();
      const isPublic = PUBLIC_ROUTES.has(pathname || '');

      if (!isAuthed && !isPublic) {
        router.replace('/login');
        return; // keep checking true until navigation
      }
      // If authed and currently on /login, optionally redirect to dashboard
      if (isAuthed && pathname === '/login') {
        router.replace('/dashboard');
        return;
      }
      setChecking(false);
    };

    enforceAuth();
  }, [pathname, router, showError]);

  if (checking) {
    // Render minimal shell to match server markup (avoid hydration diff)
    return <div style={{ minHeight: '100vh' }} />;
  }

  return <>{children}</>;
}
