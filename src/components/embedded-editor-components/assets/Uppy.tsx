import { BasePlugin, type Uppy, Meta, Body } from '@uppy/core';
import { filterNonFailedFiles, filterFilesToEmitUploadStarted } from '@uppy/utils/lib/fileFilters';
import { PluginOpts } from '@uppy/core/lib/BasePlugin';
import { AssetProps, type PlainClientAPI } from 'contentful-management';
import { Upload } from '@contentful/app-sdk/dist/types/entities';

interface ContentfulOptions extends PluginOpts {
  client: PlainClientAPI;
  contentful: {
    assetId: string;
    spaceId: string;
    environmentId: string;
    locale: string;
    setValue: (value: AssetProps['fields']['file'][string]) => void;
  };
}

export class ContentfulAssetPlugin extends BasePlugin<ContentfulOptions, Meta, Body> {
  constructor(uppy: Uppy<Meta, Body>, options: ContentfulOptions) {
    super(uppy, options);
    this.id = 'contentful';
    this.type = 'uploader';
  }

  #upload = async (fileIds: string[]) => {
    if (fileIds.length === 0) {
      return;
    }

    const files = this.uppy.getFilesByIds(fileIds);
    const filesFiltered = filterNonFailedFiles(files);
    const filesToEmit = filterFilesToEmitUploadStarted(filesFiltered);

    this.uppy.emit('upload-start', filesToEmit);

    const { spaceId, environmentId, assetId, locale, setValue } = this.opts.contentful;
    const { client } = this.opts;

    await Promise.all(
      files.map(async (file) => {
        const buffer = await file.data.arrayBuffer();

        const [upload, existingAsset] = await Promise.all([
          client.upload.create(
            {
              spaceId,
            },
            {
              file: buffer,
            }
            // Not typed out of the box for some reason
          ) as Promise<Upload>,
          client.asset.get({
            spaceId,
            environmentId,
            assetId,
          }),
        ]);

        const newFile = {
          contentType: file.type ?? 'image/jpeg',
          fileName: file.name ?? 'Untitled',
          uploadFrom: {
            sys: {
              type: 'Link',
              linkType: 'Upload',
              id: upload.sys.id,
            },
          },
        };

        const progressDivisor = Math.random() * 0.5 + 1.1;

        this.uppy.emit('upload-progress', file, {
          uploadStarted: file.progress.uploadStarted ?? 0,
          bytesTotal: file.size,
          // Fake progress
          bytesUploaded: file.size ? file.size / progressDivisor : 0,
        });

        const asset = await client.asset.update(
          {
            spaceId,
            environmentId,
            assetId,
          },
          {
            sys: existingAsset.sys,
            metadata: existingAsset.metadata,
            fields: {
              ...existingAsset.fields,
              file: {
                ...existingAsset.fields?.file,
                [locale]: newFile,
              },
            },
          }
        );

        this.uppy.emit('upload-progress', file, {
          uploadStarted: file.progress.uploadStarted ?? 0,
          bytesTotal: file.size,
          bytesUploaded: file.size ?? 0,
        });

        const processedAsset = await client.asset.processForAllLocales(
          {
            environmentId,
            spaceId,
          },
          asset
        );

        this.uppy.emit('upload-success', file, {
          uploadURL: processedAsset.fields.file[locale].url,
          status: 200,
        });

        setValue(processedAsset.fields.file[locale]);
      })
    );
  };

  install() {
    this.uppy.addUploader(this.#upload);
    super.install();
  }

  uninstall() {
    this.uppy.removeUploader(this.#upload);
    super.uninstall();
  }
}
