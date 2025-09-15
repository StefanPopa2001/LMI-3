"use client";
import { useToastContext, ToastType } from './ToastContext';

export const useToast = () => {
  const { addToast } = useToastContext();

  const showToast = (
    type: ToastType,
    message: string,
    duration?: number,
    action?: { label: string; onClick: () => void }
  ) => {
    addToast({
      type,
      message,
      duration,
      action,
    });
  };

  const success = (message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('success', message, duration, action);
  };

  const error = (message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('error', message, duration, action);
  };

  const warning = (message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('warning', message, duration, action);
  };

  const info = (message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast('info', message, duration, action);
  };

  return {
    success,
    error,
    warning,
    info,
    showToast,
  };
};
