"use client";
import React from 'react';
import { Snackbar, Alert, AlertColor, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useToastContext, ToastType } from './ToastContext';

const getSeverity = (type: ToastType): AlertColor => {
  switch (type) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastContext();

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{
            position: 'fixed',
            top: `${16 + index * 80}px !important`, // Stack toasts vertically
            right: '16px !important',
            zIndex: 1400 + index, // Ensure proper stacking
          }}
        >
          <Alert
            severity={getSeverity(toast.type)}
            variant="filled"
            action={
              <>
                {toast.action && (
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={toast.action.onClick}
                    sx={{ mr: 1 }}
                  >
                    {toast.action.label}
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => removeToast(toast.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            }
            sx={{
              minWidth: '300px',
              boxShadow: 3,
              '& .MuiAlert-message': {
                fontWeight: 500,
              },
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};
