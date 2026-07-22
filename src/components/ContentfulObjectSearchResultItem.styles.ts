import { css } from '@emotion/react';

export const ObjectSearchResultItemContainer = css`
  align-items: center;
  border: 1px solid var(--gray-300);
  border-radius: var(--rounded-base);
  background: var(--gray-50);
  display: grid;
  grid-template-columns: 1fr auto;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
  position: relative;

  &:hover {
    .drag-handle {
      opacity: 1;
    }
  }
`;

export const ObjectSearchDragHandle = css`
  border-left: 2px dotted var(--gray-300);
  border-right: 2px dotted var(--gray-300);
  position: absolute;
  inset: var(--spacing-sm) auto var(--spacing-sm) var(--spacing-sm);
  width: 5px;
  transition: opacity var(--duration-fast) var(--timing-ease-out);
  opacity: 0;
`;

export const ObjectSearchResultItemSubtitle = css`
  color: var(--gray-500);
  display: block;
  font-size: var(--fs-xs);
  line-height: 1;
`;

export const ObjectSearchResultItemTitle = css`
  align-items: center;
  color: var(--typography-base);
  display: flex;
  gap: var(--spacing-xs);
`;

export const ObjectSearchResultItemTimeStamp = css`
  color: var(--gray-500);
  font-size: var(--fs-xs);
`;

export const ObjectSearchAuthorStateGroup = css`
  align-items: center;
  display: flex;
  gap: var(--spacing-sm);
`;

export const ObjectSearchUpdateGroup = css`
  display: grid;
`;

export const ObjectSearchContentContainer = css`
  display: flex;
  gap: var(--spacing-base);
`;

export const ObjectSearchImage = css`
  width: 56px;
  object-fit: contain;
`;
