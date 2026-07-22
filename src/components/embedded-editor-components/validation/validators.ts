import { ValidationError } from '@contentful/app-sdk';
import { ContentFields, ContentTypeFieldValidation } from 'contentful-management';

type NumRange = NonNullable<ContentTypeFieldValidation['size']>;
type ValidationErrorWithoutPath = Omit<ValidationError, 'path'>;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Type guard to check if a value is a number
function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

// Validation for size (string length)
function validateSize(value: string, size: NumRange): ValidationErrorWithoutPath | null {
  const { min, max } = size;
  if ((min !== undefined && value.length < min) || (max !== undefined && value.length > max)) {
    return {
      name: 'size',
      message: `Value must be between ${min} and ${max} characters long.`,
      value,
    };
  }
  return null;
}

// Validation for range (numeric value)
function validateRange(value: number, range: NumRange): ValidationErrorWithoutPath | null {
  const { min, max } = range;
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    return {
      name: 'range',
      message: `Value must be between ${min} and ${max}.`,
      value,
    };
  }
  return null;
}

// Validation for allowed values
function validateAllowedValues(
  value: string | number,
  allowedValues: (string | number)[]
): ValidationErrorWithoutPath | null {
  if (!allowedValues.includes(value)) {
    return {
      name: 'in',
      message: `Value must be one of the following: ${allowedValues.join(', ')}.`,
      value,
    };
  }
  return null;
}

function validateIfEmpty(value: any, field: ContentFields): ValidationErrorWithoutPath | null {
  if (field.required && isEmptyValue(value)) {
    return {
      name: 'required',
      message: `Required`,
      value,
    };
  }

  return null;
}

const isEmptyValue = (value: any): boolean => {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Main validation function
export function runValidators({ value, field }: { value: any; field: ContentFields }): ValidationError[] {
  const errors: ValidationError[] = [];

  if (field.required) {
    const error = validateIfEmpty(value, field);
    if (error) {
      errors.push({ ...error, path: ['fields', field.id] });
    }
  }

  field.validations?.forEach((validation) => {
    if (isString(value)) {
      if (validation.size) {
        const error = validateSize(value, validation.size);
        if (error) errors.push({ ...error, path: ['fields', field.id] });
      }
    }

    if (isNumber(value)) {
      if (validation.range) {
        const error = validateRange(value, validation.range);
        if (error) errors.push({ ...error, path: ['fields', field.id] });
      }
    }

    if (validation.in) {
      const error = validateAllowedValues(value, validation.in);
      if (error) errors.push({ ...error, path: ['fields', field.id] });
    }
  });

  return errors;
}
