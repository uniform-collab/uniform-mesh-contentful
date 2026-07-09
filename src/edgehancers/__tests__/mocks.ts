import { ContentfulResponse } from '../lib';

export const getSingleEntryWithLinks = (itemId: string): ContentfulResponse => ({
  sys: {
    type: 'Array',
  },
  total: 1,
  skip: 0,
  limit: 100,
  items: [
    {
      metadata: {
        tags: [],
      },
      sys: {
        space: {
          sys: {
            type: 'Link',
            linkType: 'Space',
            id: 'sf6fwhgksoe0',
          },
        },
        id: itemId,
        type: 'Entry',
        createdAt: '2021-11-16T16:45:42.917Z',
        updatedAt: '2021-11-16T16:45:42.917Z',
        environment: {
          sys: {
            id: 'master',
            type: 'Link',
            linkType: 'Environment',
          },
        },
        revision: 1,
        contentType: {
          sys: {
            type: 'Link',
            linkType: 'ContentType',
            id: 'hero',
          },
        },
        locale: 'en-US',
      },
      fields: {
        title: 'Marketer Hero',
        description: 'Hey, we think you may be a marketer. This might be of interest to you!',
        buttonText: 'Whoa, I am a marketer!',
        image: {
          sys: {
            type: 'Link',
            linkType: 'Asset',
            id: '2HquYLn9LDf6yqxmQ2525o',
          },
        },
        unfrmOptIntentTag: {
          intents: {
            marketer: {
              str: 50,
            },
          },
        },
        link: {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: 'linked-entry',
          },
        },
        cycle: {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: 'cyclic-entry',
          },
        },
      },
    },
  ],
  includes: {
    Asset: [
      {
        metadata: {
          tags: [],
        },
        sys: {
          space: {
            sys: {
              type: 'Link',
              linkType: 'Space',
              id: 'sf6fwhgksoe0',
            },
          },
          id: '2HquYLn9LDf6yqxmQ2525o',
          type: 'Asset',
          createdAt: '2021-11-16T16:45:36.236Z',
          updatedAt: '2021-11-16T16:45:36.236Z',
          environment: {
            sys: {
              id: 'master',
              type: 'Link',
              linkType: 'Environment',
            },
          },
          revision: 1,
          locale: 'en-US',
        },
        fields: {
          title: 'marketer-hero-image',
          file: {
            url: '//images.ctfassets.net/sf6fwhgksoe0/2HquYLn9LDf6yqxmQ2525o/108ffe81bbfedf42175fe8034c51730b/marketer.svg',
            details: {
              size: 7021,
              image: {
                width: 560,
                height: 560,
              },
            },
            fileName: 'marketer.svg',
            contentType: 'image/svg+xml',
          },
        },
      },
    ],
    Entry: [
      {
        sys: {
          type: 'Entry',
          id: 'cyclic-entry',
        },
        fields: {
          cycle: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: itemId,
            },
          },
        },
      },
      {
        sys: {
          type: 'Entry',
          id: 'linked-entry',
        },
        fields: {
          title: 'Linked Entry',
        },
      },
    ],
  },
});

export const getMultipleEntriesWithLinks = (itemIds: string[]): ContentfulResponse => ({
  sys: {
    type: 'Array',
  },
  total: 1,
  skip: 0,
  limit: 100,
  items: itemIds.map((itemId) => ({
    metadata: {
      tags: [],
    },
    sys: {
      space: {
        sys: {
          type: 'Link',
          linkType: 'Space',
          id: 'sf6fwhgksoe0',
        },
      },
      id: itemId,
      type: 'Entry',
      createdAt: '2021-11-16T16:45:42.917Z',
      updatedAt: '2021-11-16T16:45:42.917Z',
      environment: {
        sys: {
          id: 'master',
          type: 'Link',
          linkType: 'Environment',
        },
      },
      revision: 1,
      contentType: {
        sys: {
          type: 'Link',
          linkType: 'ContentType',
          id: 'hero',
        },
      },
      locale: 'en-US',
    },
    fields: {
      title: 'Marketer Hero',
      description: 'Hey, we think you may be a marketer. This might be of interest to you!',
      buttonText: 'Whoa, I am a marketer!',
      image: {
        sys: {
          type: 'Link',
          linkType: 'Asset',
          id: '2HquYLn9LDf6yqxmQ2525o',
        },
      },
      unfrmOptIntentTag: {
        intents: {
          marketer: {
            str: 50,
          },
        },
      },
      link: {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: 'linked-entry',
        },
      },
      cycle: {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: 'cyclic-entry',
        },
      },
    },
  })),
  includes: {
    Asset: [
      {
        metadata: {
          tags: [],
        },
        sys: {
          space: {
            sys: {
              type: 'Link',
              linkType: 'Space',
              id: 'sf6fwhgksoe0',
            },
          },
          id: '2HquYLn9LDf6yqxmQ2525o',
          type: 'Asset',
          createdAt: '2021-11-16T16:45:36.236Z',
          updatedAt: '2021-11-16T16:45:36.236Z',
          environment: {
            sys: {
              id: 'master',
              type: 'Link',
              linkType: 'Environment',
            },
          },
          revision: 1,
          locale: 'en-US',
        },
        fields: {
          title: 'marketer-hero-image',
          file: {
            url: '//images.ctfassets.net/sf6fwhgksoe0/2HquYLn9LDf6yqxmQ2525o/108ffe81bbfedf42175fe8034c51730b/marketer.svg',
            details: {
              size: 7021,
              image: {
                width: 560,
                height: 560,
              },
            },
            fileName: 'marketer.svg',
            contentType: 'image/svg+xml',
          },
        },
      },
    ],
    Entry: [
      {
        sys: {
          type: 'Entry',
          id: 'cyclic-entry',
        },
        fields: {
          cycle: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: itemIds[0],
            },
          },
        },
      },
      {
        sys: {
          type: 'Entry',
          id: 'linked-entry',
        },
        fields: {
          title: 'Linked Entry',
        },
      },
    ],
  },
});

export const getSingleEntryWithInclude4 = (itemId: string): ContentfulResponse => ({
  sys: {
    type: 'Array',
  },
  total: 1,
  skip: 0,
  limit: 100,
  items: [
    {
      sys: {
        type: 'Entry',
        locale: 'en-US',
        id: itemId,
      },
      fields: {
        linkfield: {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: 'level1',
          },
        },
      },
    },
  ],
  includes: {
    Entry: [
      {
        sys: {
          type: 'Entry',
          locale: 'en-US',
          id: 'level1',
        },
        fields: {
          linkfield: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: 'level2',
            },
          },
        },
      },
      {
        sys: {
          type: 'Entry',
          locale: 'en-US',
          id: 'level2',
        },
        fields: {
          linkfield: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: 'level3',
            },
          },
        },
      },
      {
        sys: {
          type: 'Entry',
          locale: 'en-US',
          id: 'level3',
        },
        fields: {
          linkfield: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: 'level4',
            },
          },
        },
      },
      {
        sys: {
          type: 'Entry',
          locale: 'en-US',
          id: 'level4',
        },
        fields: {
          linkfield: { sys: { type: 'Link', linkType: 'Entry', id: 'level5' } },
        },
      },
    ],
  },
});

export const getSingleEntryWithRichText = (itemId: string): ContentfulResponse => ({
  sys: { type: 'Array' },
  total: 1,
  skip: 0,
  limit: 100,
  items: [
    {
      metadata: { tags: [] },
      sys: {
        space: { sys: { type: 'Link', linkType: 'Space', id: 'sf6fwhgksoe0' } },
        id: itemId,
        type: 'Entry',
        createdAt: '2023-10-11T09:48:28.117Z',
        updatedAt: '2023-10-25T13:30:22.062Z',
        environment: { sys: { id: 'master', type: 'Link', linkType: 'Environment' } },
        revision: 11,
        contentType: { sys: { type: 'Link', linkType: 'ContentType', id: 'test' } },
        locale: 'en-US',
      },
      fields: {
        title: 'lol',
        rich: {
          data: {},
          content: [
            {
              data: {},
              content: [{ data: {}, marks: [], value: 'blah', nodeType: 'text' }],
              nodeType: 'paragraph',
            },
            {
              data: {},
              content: [{ data: {}, marks: [], value: 'blah', nodeType: 'text' }],
              nodeType: 'paragraph',
            },
            {
              data: {
                target: { sys: { id: '2mMhAwpSReQIFfgzGZT1Y5', type: 'Link', linkType: 'Entry' } },
              },
              content: [],
              nodeType: 'embedded-entry-block',
            },
          ],
          nodeType: 'document',
        },
      },
    },
  ],
  includes: {
    Entry: [
      {
        metadata: { tags: [] },
        sys: {
          space: { sys: { type: 'Link', linkType: 'Space', id: 'sf6fwhgksoe0' } },
          id: '2mMhAwpSReQIFfgzGZT1Y5',
          type: 'Entry',
          createdAt: '2023-10-24T15:09:07.344Z',
          updatedAt: '2023-10-24T15:09:07.344Z',
          environment: { sys: { id: 'master', type: 'Link', linkType: 'Environment' } },
          revision: 1,
          contentType: { sys: { type: 'Link', linkType: 'ContentType', id: 'test' } },
          locale: 'en-US',
        },
        fields: { title: 'blah' },
      },
    ],
  },
});

export const getMultipleEntriesWithSameLinks = (itemIds: string[]): ContentfulResponse => ({
  sys: {
    type: 'Array',
  },
  total: 1,
  skip: 0,
  limit: 100,
  items: itemIds.map((itemId) => ({
    sys: {
      id: itemId,
      type: 'Entry',
    },
    fields: {
      link: {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: 'linked-entry',
        },
      },
    },
  })),
  includes: {
    Entry: [
      {
        sys: {
          type: 'Entry',
          id: 'linked-entry',
        },
        fields: {
          sameLink: {
            sys: {
              type: 'Link',
              linkType: 'Entry',
              id: itemIds[0],
            },
          },
        },
      },
    ],
  },
});

export const getEmptyItems = (ids: string[]): ContentfulResponse => {
  const result: ContentfulResponse = {
    sys: {
      type: 'Array',
    },
    items: [],
  };

  ids.forEach((id) => {
    result.items.push({
      sys: {
        type: 'Entry',
        id,
      },
      fields: {
        title: id,
      },
    });
  });

  return result;
};
