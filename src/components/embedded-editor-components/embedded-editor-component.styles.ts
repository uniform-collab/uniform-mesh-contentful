import { css } from '@emotion/react';

export const AuthorizationOverlay = css`
  inset: 0;
  min-height: 25rem;
`;

export const AuthirozationOverlayContainer = css`
  padding: var(--spacing-lg);
  max-width: 350px;
  width: 100%;
  --tw-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  background-color: white;
`;
