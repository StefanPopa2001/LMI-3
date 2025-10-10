/**
 * Common form components
 * Reusable form elements with consistent styling
 */
import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

/**
 * Form text input field
 */
export const FormInput: React.FC<TextFieldProps> = (props) => {
  return (
    <TextField
      fullWidth
      variant="outlined"
      margin="normal"
      {...props}
    />
  );
};

/**
 * Form email input field
 */
export const FormEmailInput: React.FC<Omit<TextFieldProps, 'type'>> = (props) => {
  return (
    <FormInput
      type="email"
      autoComplete="email"
      {...props}
    />
  );
};

/**
 * Form password input field
 */
export const FormPasswordInput: React.FC<Omit<TextFieldProps, 'type'>> = (props) => {
  return (
    <FormInput
      type="password"
      autoComplete="current-password"
      {...props}
    />
  );
};

/**
 * Form phone input field
 */
export const FormPhoneInput: React.FC<Omit<TextFieldProps, 'type'>> = (props) => {
  return (
    <FormInput
      type="tel"
      autoComplete="tel"
      {...props}
    />
  );
};
