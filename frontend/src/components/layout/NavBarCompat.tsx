'use client';
/**
 * Backward compatibility wrapper for old NavBar usage
 * This allows pages that haven't been migrated yet to still work
 */
import React from 'react';

interface NavBarCompatProps {
  title?: string;
}

export default function NavBarCompat({ title }: NavBarCompatProps) {
  // For pages using the old NavBar pattern, we just return null
  // since they're expected to be wrapped in a layout or use inline components
  return null;
}
