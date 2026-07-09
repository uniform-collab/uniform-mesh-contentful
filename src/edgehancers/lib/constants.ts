export const SYS_ID_IN_PARAM = 'sys.id[in]';
export const ACCESS_TOKEN_PARAM = 'access_token';

export const SINGLE_ENTRY_BATCH_SIZE = 30;

// URI request length: 7,600 characters
// https://www.contentful.com/developers/docs/technical-limits/
// Contentful ID length is 22 characters and we request only `sys` field, so we should be safe.
export const CMA_BATCH_SIZE = 100;
