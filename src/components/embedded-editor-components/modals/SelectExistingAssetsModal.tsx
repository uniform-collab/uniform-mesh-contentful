import React, { useState, useEffect } from 'react';
import { AssetProps } from 'contentful-management';
import { TextInput, Stack, AssetCard, Grid, Modal, Button, Tooltip } from '@contentful/f36-components';
import { useContentfulContext } from '../ContentfulContext';
import { useContentfulAssets } from '../dataHooks';
import { getFileType } from '../assets/utils';
import { entityHelpers } from '@contentful/field-editor-shared';
// @ts-expect-error
import { getTypesForGroup } from '@contentful/mimetype';
interface SelectExistingAssetsModalProps {
  onCancel: () => void;
  isShown: boolean;
  onConfirm: (assets: AssetProps[]) => void;
  isMultiSelectAllowed?: boolean;
  locale?: string;
  mimetypeGroups?: string[];
  min?: number;
  max?: number;
}

export const SelectExistingAssetsModal: React.FC<SelectExistingAssetsModalProps> = ({
  onCancel,
  isShown,
  onConfirm,
  isMultiSelectAllowed = true,
  locale: localeCode,
  mimetypeGroups,
  min,
  max,
}) => {
  const { defaultLocale, locales } = useContentfulContext();

  // @todo we should use getFieldValue for better locale support
  const locale = locales.find((l) => l.code === localeCode) ?? defaultLocale;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<AssetProps[]>([]);
  const { spaceId, environmentId } = useContentfulContext();

  const mimeTypes = mimetypeGroups?.map((group) => getTypesForGroup(group)).flat();

  const { data: searchResults, isLoading } = useContentfulAssets(
    {
      spaceId,
      environmentId,
      query: { query: debouncedSearchQuery, 'fields.file.contentType[in]': mimeTypes?.join(',') },
    },
    isShown
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onAssetSelect = (asset: AssetProps) => {
    if (isMultiSelectAllowed) {
      setSelectedAssets((prev) =>
        prev.some((e) => e.sys.id === asset.sys.id)
          ? prev.filter((e) => e.sys.id !== asset.sys.id)
          : prev.concat(asset)
      );
    } else {
      setSelectedAssets([asset]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedAssets);
    setSelectedAssets([]);
  };
  const handleCancel = () => {
    onCancel();
    setSelectedAssets([]);
  };

  const tooFewAssetsSelected = min !== undefined && selectedAssets.length < min;
  const tooManyAssetsSelected = max !== undefined && selectedAssets.length > max;

  return (
    <Modal
      isShown={isShown}
      onClose={() => {
        handleCancel();
      }}
      size="large"
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
                placeholder="Search assets..."
                type="text"
              />

              {isLoading ? (
                <Grid
                  columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)"
                  rowGap="spacingM"
                  columnGap="spacingM"
                  style={{
                    width: '100%',
                  }}
                >
                  <Grid.Item>
                    <AssetCard isLoading size="small" />
                  </Grid.Item>
                  <Grid.Item>
                    <AssetCard isLoading size="small" />
                  </Grid.Item>
                  <Grid.Item>
                    <AssetCard isLoading size="small" />
                  </Grid.Item>
                  <Grid.Item>
                    <AssetCard isLoading size="small" />
                  </Grid.Item>
                  <Grid.Item>
                    <AssetCard isLoading size="small" />
                  </Grid.Item>
                  <Grid.Item>
                    <AssetCard isLoading size="small" />
                  </Grid.Item>
                </Grid>
              ) : (
                <Grid
                  columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)"
                  rowGap="spacingM"
                  columnGap="spacingM"
                  style={{
                    width: '100%',
                  }}
                >
                  {searchResults?.items.map((asset) => {
                    return (
                      <Grid.Item key={asset.sys.id}>
                        <AssetCard
                          title={entityHelpers.getAssetTitle({
                            asset,
                            localeCode: localeCode ?? defaultLocale.code,
                            defaultLocaleCode: defaultLocale.code,
                            defaultTitle: 'Untitled',
                          })}
                          onClick={() => {
                            onAssetSelect(asset);
                          }}
                          src={
                            asset.fields.file?.[locale.code]?.url
                              ? `${asset.fields.file[locale.code].url}?h=600`
                              : undefined
                          }
                          type={getFileType(asset.fields.file?.[locale.code])}
                          status={entityHelpers.getEntityStatus(asset.sys)}
                          isSelected={selectedAssets.some((e) => e.sys.id === asset.sys.id)}
                          style={{
                            width: '100%',
                          }}
                        />
                      </Grid.Item>
                    );
                  })}
                  {searchResults?.items.length === 0 && <div className="text-gray-500">No assets found</div>}
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
                tooManyAssetsSelected
                  ? `Select at most ${max} assets`
                  : tooFewAssetsSelected
                    ? `Select at least ${min} assets`
                    : ''
              }
              isDisabled={!tooManyAssetsSelected && !tooFewAssetsSelected}
            >
              <Button
                size="small"
                variant="positive"
                isDisabled={selectedAssets.length === 0 || tooFewAssetsSelected || tooManyAssetsSelected}
                onClick={() => {
                  handleConfirm();
                }}
              >
                {selectedAssets.length > 0
                  ? `Add ${selectedAssets.length} ${selectedAssets.length > 1 ? 'assets' : 'asset'}`
                  : 'Select assets'}
              </Button>
            </Tooltip>
          </Modal.Controls>
        </>
      )}
    </Modal>
  );
};
