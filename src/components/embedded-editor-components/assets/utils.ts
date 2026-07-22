import { AssetProps as AssetComponentProps } from '@contentful/f36-components';
// @ts-expect-error
import mimetype from '@contentful/mimetype';
import { AssetProps } from 'contentful-management';

// Borrowed from https://github.com/contentful/field-editors/blob/master/packages/reference/src/assets/WrappedAssetCard/WrappedAssetCard.tsx
const groupToIconMap: Record<string, AssetComponentProps['type']> = {
  image: 'image',
  video: 'video',
  audio: 'audio',
  richtext: 'richtext',
  presentation: 'presentation',
  spreadsheet: 'spreadsheet',
  pdfdocument: 'pdf',
  archive: 'archive',
  plaintext: 'plaintext',
  code: 'code',
  markup: 'markup',
};

export function getFileType(file?: AssetProps['fields']['file'][string]): AssetComponentProps['type'] {
  if (!file) {
    return 'archive';
  }

  const groupName: keyof typeof groupToIconMap = mimetype.getGroupLabel({
    type: file.contentType,
    fallbackFileName: file.fileName,
  });

  return groupToIconMap[groupName] || 'archive';
}
