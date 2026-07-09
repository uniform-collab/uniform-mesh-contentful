import { FC } from 'react';
import { useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { AssetsSelector } from '../../components';
import { AssetTypeEditorConfigs } from '../../types/mesh';

const AssetsEntryDataEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    metadata,
    getDataResource,
  } = useMeshLocation<'dataResource'>();
  const { mimeTypes, searchType, enableFilterByLocale } =
    (metadata.dataType.custom as AssetTypeEditorConfigs) || {};

  const handleSetValue = (assetsIds: string[], locale: string) => {
    setMeshLocationValue(() => ({
      newValue: {
        assetsIds: assetsIds.join(','),
        // ensure we don't set locale if filtering by locale is disabled
        locale: enableFilterByLocale ? locale : '',
      },
    }));
  };

  const { assetsIds, contentTypeId, locale } = meshLocationValue;

  return (
    <div className="entry-search-wrapper">
      <AssetsSelector
        getDataResource={getDataResource}
        mimeTypes={mimeTypes}
        searchType={searchType}
        handleSetValue={handleSetValue}
        selectedItemsIds={assetsIds ? assetsIds.split(',') : []}
        selectedContentTypeId={contentTypeId}
        locale={locale}
        enableFilterByLocale={enableFilterByLocale}
      />
    </div>
  );
};

export default AssetsEntryDataEditor;
