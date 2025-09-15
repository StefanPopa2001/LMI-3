'use client';
import React from 'react';
import { Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  to?: string;
  label?: string;
}

export default function BackButton({ to = '/dashboard', label = 'Back to Dashboard' }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      startIcon={<ArrowBack />}
      onClick={() => router.push(to)}
      sx={{ mb: 3 }}
    >
      {label}
    </Button>
  );
}
