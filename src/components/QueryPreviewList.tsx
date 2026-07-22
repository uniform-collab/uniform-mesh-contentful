import { FC, useMemo } from 'react';
import { Callout } from '@uniformdev/mesh-sdk-react';
import { SelectedItemComponent } from './SelectedItemComponent';
import { InternalEntry } from '../types/common';
import { ARCHETYPES } from '../constants';
import { mapValidationError } from '../utils/mapper';

interface QueryPreviewListProps {
  items: InternalEntry[];
  contentTypeLabel?: string;
  value?: string;
  archetype?: ARCHETYPES;
  error?: Error;
  reload: () => void;
}
export const QueryPreviewList: FC<QueryPreviewListProps> = ({
  items,
  contentTypeLabel,
  value,
  archetype = ARCHETYPES.ENTRIES_BY_FIELD,
  error,
  reload,
}) => {
  const mappedItems = useMemo(
    () =>
      items.map((entry) => (
        <div key={`dam-selected-item-${entry.id}`} className="loaded-entry">
          <SelectedItemComponent
            embeddedEditorEnabled
            selectedItem={entry}
            disableDnD
            reloadEntries={reload}
          />
        </div>
      )),
    [items, reload]
  );

  if (error) {
    return <Callout type="error">{mapValidationError(error)}</Callout>;
  }

  if (!items.length) {
    if (!value && archetype !== ARCHETYPES.QUERY) {
      return <Callout type="info">Please provide a field value to get started.</Callout>;
    }
    return (
      <Callout type="info">
        {contentTypeLabel
          ? `No "${contentTypeLabel}" content was found`
          : `No matches. Please adjust the query.`}
      </Callout>
    );
  }

  return <div className="data-type-editor">{mappedItems}</div>;
};
