import React, { useState, useEffect } from 'react';
import { EntryProps } from 'contentful-management';
import {
  EntryCard,
  TextInput,
  Stack,
  EntityStatus,
  Modal,
  Tooltip,
  Button,
  Grid,
} from '@contentful/f36-components';
import { useContentfulContext } from '../ContentfulContext';
import { useContentfulEntries } from '../dataHooks';
import { entityHelpers } from '@contentful/field-editor-shared';

interface SelectExistingEntriesModalProps {
  onCancel: () => void;
  isShown: boolean;
  onConfirm: (entries: EntryProps[]) => void;
  isMultiSelectAllowed?: boolean;
  contentTypes?: string[];
  locale?: string;
  min?: number;
  max?: number;
}

export const SelectExistingEntriesModal: React.FC<SelectExistingEntriesModalProps> = ({
  onCancel,
  isShown,
  onConfirm,
  isMultiSelectAllowed = true,
  contentTypes: contentTypeIds = [],
  locale: localeCode,
  min,
  max,
}) => {
  const { defaultLocale, contentTypes } = useContentfulContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<EntryProps[]>([]);
  const { spaceId, environmentId } = useContentfulContext();

  const { data: searchResults, isLoading } = useContentfulEntries(
    {
      spaceId,
      environmentId,
      query: {
        query: debouncedSearchQuery,
        content_type: contentTypeIds.length === 1 ? contentTypeIds[0] : undefined,
        'sys.contentType.sys.id[in]': contentTypeIds.length > 1 ? contentTypeIds.join(',') : undefined,
      },
    },
    isShown
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onEntrySelect = (entry: EntryProps) => {
    if (isMultiSelectAllowed) {
      setSelectedEntries((prev) =>
        prev.some((e) => e.sys.id === entry.sys.id)
          ? prev.filter((e) => e.sys.id !== entry.sys.id)
          : [...prev, entry]
      );
    } else {
      setSelectedEntries([entry]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedEntries);
    setSelectedEntries([]);
  };
  const handleCancel = () => {
    onCancel();
    setSelectedEntries([]);
  };

  const tooFewEntriesSelected = min !== undefined && selectedEntries.length < min;
  const tooManyEntriesSelected = max !== undefined && selectedEntries.length > max;

  return (
    <Modal
      isShown={isShown}
      position="top"
      onClose={() => {
        handleCancel();
      }}
      className="top-z-index-modals"
    >
      {() => (
        <>
          <Modal.Header
            title="Add existing assets"
            onClose={() => {
              handleCancel();
            }}
          />
          <Modal.Content>
            <Stack flexDirection="column" spacing="spacingM">
              <TextInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                type="text"
              />

              {isLoading ? (
                <Grid
                  columns="minmax(0, 1fr)"
                  rowGap="spacingM"
                  columnGap="spacingM"
                  style={{
                    width: '100%',
                  }}
                >
                  <Grid.Item>
                    <EntryCard key="loading-skeleton-1" isLoading />
                  </Grid.Item>
                  <Grid.Item>
                    <EntryCard key="loading-skeleton-2" isLoading />
                  </Grid.Item>
                  <Grid.Item>
                    <EntryCard key="loading-skeleton-3" isLoading />
                  </Grid.Item>
                  <Grid.Item>
                    <EntryCard key="loading-skeleton-4" isLoading />
                  </Grid.Item>
                </Grid>
              ) : (
                <Grid
                  columns="minmax(0, 1fr)"
                  rowGap="spacingM"
                  columnGap="spacingM"
                  style={{
                    width: '100%',
                  }}
                >
                  {searchResults?.items.map((entry) => (
                    <Grid.Item key={entry.sys.id}>
                      <EntryCard
                        status={getEntityStatus(entry)}
                        contentType={entry.sys.contentType?.sys.id}
                        title={entityHelpers.getEntryTitle({
                          entry,
                          contentType: contentTypes.find((c) => c.sys.id === entry.sys.contentType?.sys.id)!,
                          localeCode: localeCode ?? defaultLocale.code,
                          defaultLocaleCode: defaultLocale.code,
                          defaultTitle: 'Untitled',
                        })}
                        onClick={() => {
                          onEntrySelect(entry);
                        }}
                        isSelected={selectedEntries.some((e) => e.sys.id === entry.sys.id)}
                      />
                    </Grid.Item>
                  ))}
                  {searchResults?.items.length === 0 && <div className="text-gray-500">No entries found</div>}
                </Grid>
              )}
            </Stack>
          </Modal.Content>
          <Modal.Controls>
            <Button
              size="small"
              variant="transparent"
              onClick={() => {
                handleCancel();
              }}
            >
              Cancel
            </Button>
            <Tooltip
              placement="top"
              content={
                tooManyEntriesSelected
                  ? `Select at most ${max} entries`
                  : tooFewEntriesSelected
                    ? `Select at least ${min} entries`
                    : ''
              }
              isDisabled={!tooManyEntriesSelected && !tooFewEntriesSelected}
            >
              <Button
                size="small"
                variant="positive"
                isDisabled={selectedEntries.length === 0 || tooFewEntriesSelected || tooManyEntriesSelected}
                onClick={() => {
                  handleConfirm();
                }}
              >
                {selectedEntries.length > 0
                  ? `Add ${selectedEntries.length} ${selectedEntries.length > 1 ? 'entries' : 'entry'}`
                  : 'Select entries'}
              </Button>
            </Tooltip>
          </Modal.Controls>
        </>
      )}
    </Modal>
  );
};

const getEntityStatus = (entity: EntryProps): EntityStatus => {
  if (!entity.sys.publishedVersion) {
    return 'draft';
  }
  if (!!entity.sys.publishedVersion && entity.sys.version >= entity.sys.publishedVersion + 2) {
    return 'changed';
  }
  if (entity.sys.archivedVersion) {
    return 'archived';
  }
  return 'published';
};
