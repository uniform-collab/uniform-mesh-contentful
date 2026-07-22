import { AssetProps, LocaleProps } from 'contentful-management';
import { FileUploadProvider, useUploadContext } from './FileUploadProvider';
import { DragDrop, StatusBar } from '@uppy/react';
import { AssetCard, FormControl, MenuItem } from '@contentful/f36-components';

import '@uppy/core/dist/style.min.css';
import '@uppy/drag-drop/dist/style.min.css';
import '@uppy/progress-bar/dist/style.min.css';
import '@uppy/status-bar/dist/style.min.css';
import { useEditorContext } from '../EditorContext';
import { getFileType } from './utils';

export const AssetFileField = ({
  assetId,
  locale,
  value,
  setValue,
}: {
  assetId: string;
  locale: LocaleProps;
  value: AssetProps['fields']['file'][string];
  setValue: (value: AssetProps['fields']['file'][string] | null) => void;
}) => {
  return (
    <FileUploadProvider
      assetId={assetId}
      locale={locale.code}
      maxNumberOfFiles={1}
      setValue={setValue}
      autoProceed
    >
      <AssetFileFieldInner value={value} setValue={setValue} locale={locale} />
    </FileUploadProvider>
  );
};

const AssetFileFieldInner = ({
  value,
  setValue,
  locale,
}: {
  value: AssetProps['fields']['file'][string];
  setValue: (value: AssetProps['fields']['file'][string] | null) => void;
  locale: LocaleProps;
}) => {
  const { uppy, isUploading } = useUploadContext();
  const { activeLocales } = useEditorContext();

  if (value && value.url) {
    return (
      <div className="asset-file-field">
        <FormControl isRequired>
          <FormControl.Label>{activeLocales.length > 1 ? `File | ${locale.name}` : 'File'}</FormControl.Label>
          <div className="asset-file-field-inner">
            <AssetCard
              src={`${value.url}?h=600`}
              type={getFileType(value)}
              title={value.fileName}
              actions={[
                <MenuItem
                  key="download"
                  onClick={() => {
                    window.open(value.url, '_blank');
                  }}
                >
                  Download
                </MenuItem>,
                <MenuItem
                  key="delete"
                  onClick={() => {
                    setValue(null);

                    uppy.clear();
                  }}
                >
                  Delete
                </MenuItem>,
              ]}
            />
          </div>
        </FormControl>
      </div>
    );
  }

  return (
    <div className="asset-file-field">
      <FormControl isRequired>
        <FormControl.Label>{activeLocales.length > 1 ? `File | ${locale.name}` : 'File'}</FormControl.Label>
        <div className="asset-file-field-inner">
          <div className="uppy-wrapper">
            <div className={`uppy-drop-zone-wrapper ${isUploading ? 'is-uploading' : ''}`}>
              <DragDrop uppy={uppy} />
            </div>
            <div className={`uppy-status-bar-wrapper ${isUploading ? 'is-uploading' : ''}`}>
              <StatusBar uppy={uppy} hideCancelButton />
            </div>
          </div>
        </div>
      </FormControl>
    </div>
  );
};
