import { ContentTypeProps } from 'contentful-management';

export const assetFakeContentType: ContentTypeProps = {
  name: 'Asset',
  description: '',
  displayField: 'title',
  fields: [
    {
      id: 'title',
      name: 'Title',
      type: 'Symbol',
      localized: true,
      required: true,
      validations: [],
      disabled: false,
      omitted: false,
    },
    {
      id: 'description',
      name: 'Description',
      type: 'Text',
      localized: true,
      required: false,
      validations: [],
      disabled: false,
      omitted: false,
    },
  ],
  sys: {
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: 'osgw223304rr',
      },
    },
    id: 'asset',
    type: 'ContentType',
    createdAt: '2024-11-28T15:31:06.126Z',
    updatedAt: '2024-11-28T15:31:06.571Z',
    environment: {
      sys: {
        id: 'master',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    publishedVersion: 1,
    firstPublishedAt: '2024-11-28T15:31:06.571Z',
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '7AxZojsKxW0vLesTGaiYX7',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '7AxZojsKxW0vLesTGaiYX7',
      },
    },
    publishedCounter: 1,
    version: 2,
  },
};
