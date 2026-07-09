import { format as timeAgo } from 'timeago.js';
import { BadgeThemeProps } from '@uniformdev/mesh-sdk-react';

import { get, isValidUrl } from '.';
import { ARCHETYPES, INVALID_SEARCH_FORMAT, STATUS_TYPES, UNKNOWN } from '../constants';
import { ContentType, InternalContentType, InternalEntry, QueryParameter } from '../types/common';
import {
  AssetsResponse,
  AssetType,
  ContentTypesResponse,
  EntriesResponse,
  SysType,
} from '../types/contentfulTypes';
import PopoverData from '../components/PopoverData';

export const mapContentType = ({ items }: ContentTypesResponse): ContentType[] =>
  items.map(({ sys: { id: sysId }, name, fields, displayField }) => ({
    id: sysId,
    name,
    displayField,
    fields: fields.map(({ id, name, items, type, linkType }) => ({
      id,
      name,
      linkType: linkType || items?.linkType,
      type,
    })),
  }));

const formatFileSize = (bytes: number): string => {
  if (bytes < 102.4) {
    return bytes + ' B';
  }
  const kb = bytes / 102.4;
  if (kb < 102.4) {
    return kb.toFixed(2) + ' KB';
  }
  const mb = kb / 102.4;
  if (mb < 102.4) {
    return mb.toFixed(2) + ' MB';
  }
  const gb = mb / 102.4;

  return gb.toFixed(2) + ' GB';
};

export const contentTypeToInternalContentType = (arr: ContentType[]) => {
  return arr.map((item) => {
    return {
      id: item.id,
      name: item.displayField,
      label: item.name,
    } as InternalContentType;
  });
};

export const mapResultEntry = (
  { items, includes }: EntriesResponse,
  options: {
    displayField?: string;
    slugField?: string;
    imagePath?: string;
    archetype?: ARCHETYPES;
  },
  allowContentTypes?: ContentType[]
): InternalEntry[] => {
  const { imagePath = '', displayField = '', archetype, slugField = '' } = options;

  return items.map(({ fields, sys }) => {
    let imageUrl = '';
    if (imagePath) {
      const asset = get(fields, imagePath);
      const assetId = (asset as AssetType)?.sys?.id;
      const assetContent =
        includes &&
        Object.values(includes)
          ?.flat()
          ?.find((include) => include.sys.id === assetId);
      const assetUrl = assetContent?.fields?.file?.url;

      if (assetUrl) {
        imageUrl = `${assetUrl}?w=52&h=52`;
      } else if (typeof asset === 'string' && isValidUrl(asset)) {
        // if thumbnail field is not an asset by text field, it can be just a string with url
        imageUrl = asset;
      } else {
        imageUrl = '';
      }
    }

    const computedDisplayField =
      allowContentTypes?.find((ct) => ct.id === sys.contentType.sys.id)?.displayField ?? displayField;

    const displayTitle = computedDisplayField && get(fields, computedDisplayField);
    const slug = slugField && get<string>(fields, slugField);

    const contentType = get<string>(sys, 'contentType.sys.id', UNKNOWN);
    const contentTypeDisplayName =
      allowContentTypes?.find((ct) => ct.id === contentType)?.name ?? contentType;

    return {
      ...fields,
      hideRemoveButton: archetype === ARCHETYPES.QUERY,
      editLink: `https://app.contentful.com/spaces/${sys.space.sys.id}/environments/${sys.environment.sys.id}/entries/${sys.id}`,
      title: displayTitle && typeof displayTitle === 'string' ? displayTitle : sys.id,
      id: sys.id,
      imageUrl,
      contentType: contentTypeDisplayName,
      metadata: {
        ...(sys?.contentType?.sys?.id && { 'Content Type': sys.contentType.sys.id }),
        Updated: timeAgo(sys.updatedAt || ''),
      },
      popoverData: PopoverData({ sys, slug }),
      publishStatus: getPublishStatus(sys),
      createdAt: sys.createdAt || '',
    };
  });
};

const getPublishStatus = (sys: SysType): { text: STATUS_TYPES; theme: BadgeThemeProps } => {
  if (!sys.version && !sys.publishedVersion && !sys.archivedVersion) {
    return { text: STATUS_TYPES.Published, theme: 'success' };
  }

  if (sys.archivedVersion) {
    return { text: STATUS_TYPES.Unpublished, theme: 'error' };
  } else if (!sys.publishedVersion) {
    return { text: STATUS_TYPES.Draft, theme: 'info' };
  } else if (!!sys.publishedVersion && sys.version! >= sys.publishedVersion + 2) {
    return { text: STATUS_TYPES.Modified, theme: 'note' };
  } else {
    return { text: STATUS_TYPES.Published, theme: 'success' };
  }
};

export const mapResultAssets = ({ items }: AssetsResponse): InternalEntry[] => {
  return items.map(({ fields, sys }) => {
    const fileUrl =
      fields.file?.contentType?.includes('image') && fields.file?.url ? fields.file.url : UNKNOWN;
    return {
      ...fields,
      title: fields.title || sys.id,
      editLink: `https://app.contentful.com/spaces/${sys.space.sys.id}/environments/${sys.environment.sys.id}/assets/${sys.id}`,
      id: sys.id,
      contentType: fields.file?.contentType,
      metadata: {
        ...(sys?.contentType?.sys?.id && { 'Content Type': sys.contentType.sys.id }),
        Updated: timeAgo(sys.updatedAt || ''),
      },
      popoverData: PopoverData({
        sys,
        size: fields.file?.details?.size !== undefined ? formatFileSize(fields.file.details.size) : 'n/a',
        fileName: fields.file?.fileName || 'n/a',
      }),
      publishStatus: getPublishStatus(sys),
      createdAt: sys.createdAt || '',
      fileUrl,
      fileName: fields.file?.fileName || '',
    };
  });
};

export const mapCustomQuery = (customQuery?: string): QueryParameter[] | undefined => {
  if (customQuery) {
    try {
      return JSON.parse(customQuery);
    } catch {
      return undefined;
    }
  }
  return [];
};

export const mapValidationError = (error: any): string => {
  try {
    const stringError = String(error);

    const validationError = JSON.parse(
      stringError.substring(stringError.indexOf('{'), stringError.length - 1)
    );

    return validationError.message;
  } catch {
    return INVALID_SEARCH_FORMAT;
  }
};
