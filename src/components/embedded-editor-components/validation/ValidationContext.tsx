import React, { createContext, useContext, useState } from 'react';
import { ValidationError } from '@contentful/app-sdk';
import mitt from 'mitt';

interface ValidationContextType {
  errors: ValidationError[];
  setErrors: (errors: ValidationError[]) => void;
  addFieldError: (error: ValidationError) => void;
  clearAllErrors: () => void;
  clearFieldErrors: (fieldId: string) => void;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export function ValidationProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const addFieldError = (error: ValidationError) => {
    setErrors((prevErrors) => [...prevErrors, error]);
  };

  const clearFieldErrors = (fieldId: string) => {
    setErrors((prevErrors) => prevErrors.filter((error) => error.path?.[1] !== fieldId));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const value = {
    errors,
    setErrors,
    addFieldError,
    clearAllErrors,
    clearFieldErrors,
  };

  return <ValidationContext.Provider value={value}>{children}</ValidationContext.Provider>;
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (context === undefined) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
}

export type ValidationErrorsEvents = {
  errorsChanged: {
    entryId: string;
    fieldId: string;
    localeCode: string;
    errors: ValidationError[];
  };
};

export const validationErrorsEmitter = mitt<ValidationErrorsEvents>();
