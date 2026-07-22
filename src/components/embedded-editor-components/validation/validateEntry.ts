import { ValidationError } from '@contentful/app-sdk';
import { EntryProps, ContentType, ContentTypeProps, ContentFields } from 'contentful-management';
import { runValidators } from './validators';

export const validateEntry = ({
  localeCode,
  entry,
  contentType,
}: {
  localeCode: string;
  defaultLocaleCode: string;
  entry: EntryProps;
  contentType: ContentType;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Get all fields from content type
  const fields = contentType.fields;

  // Iterate through each field in the content type
  fields.forEach((field: ContentFields) => {
    errors.push(...runValidatorsAgainstField({ field, entry, localeCode }));
  });

  return errors;
};

export const validateField = ({
  localeCode,
  fieldId,
  entry,
  contentType,
}: {
  localeCode: string;
  fieldId: string;
  entry: EntryProps;
  contentType: ContentTypeProps;
}): ValidationError[] => {
  // Get all fields from content type
  const field = contentType.fields.find((f) => f.id === fieldId);

  if (!field) {
    return [];
  }

  return runValidatorsAgainstField({ field, entry, localeCode });
};

// @todo useless wrapper function, use runValidators directly
export const runValidatorsAgainstField = ({
  field,
  entry,
  localeCode,
}: {
  field: ContentFields;
  entry: EntryProps;
  localeCode: string;
}) => {
  const fieldValue = getFieldLocalizedValue({
    entity: entry,
    fieldId: field.id,
    localeCode,
  });

  return runValidators({ value: fieldValue, field });
};

/**
 * Helper function to get localized or not value from the entity using field id.
 *  Does not have fallback to default or any locale like the Contentful SDK has.
 */
const getFieldLocalizedValue = ({
  /**
   * Expects an entity fetched with a flag Skip-Transformation: true
   */
  entity,
  fieldId,
  localeCode,
}: {
  entity: {
    fields: { [key: string]: { [valueKey: string]: string | undefined } };
  };
  fieldId: string;
  localeCode: string;
}): any => {
  const values = entity.fields[fieldId];
  if (typeof values === 'object' && !Array.isArray(values) && values !== null) {
    return values[localeCode];
  }

  return;
};
