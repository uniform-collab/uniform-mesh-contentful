import { UploadResult, Uppy, type Meta, type Body } from '@uppy/core';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ContentfulAssetPlugin } from './Uppy';
import { useContentfulContext } from '../ContentfulContext';
import { AssetProps } from 'contentful-management';

interface UploadContextState {
  error: (Error & { details?: string }) | null;
  uppy?: Uppy<Meta, Body>;
  isUploading: boolean;
  totalProgress: number;
}

const UploadContext = createContext<UploadContextState>({
  error: null,
  isUploading: false,
  totalProgress: 0,
});

interface FileUploadProviderProps {
  assetId: string;
  locale: string;
  autoProceed?: boolean;
  onUploadComplete?(): void;
  onBatchUploadComplete?(): void;
  allowedFileTypes?: string[];
  maxNumberOfFiles?: number;
  setValue: (value: AssetProps['fields']['file'][string]) => void;
}

export function useUploadContext(): Omit<UploadContextState, 'uppy'> & {
  uppy: Required<UploadContextState>['uppy'];
} {
  const { error, isUploading, totalProgress, uppy } = useContext(UploadContext);

  if (!uppy) {
    throw new Error('useUploadContext must be used within a FileUploadProvider');
  }

  return { error, isUploading, totalProgress, uppy };
}

/**
 * Uppy reports an error even if the user cancelled the upload.
 * This function decides with the error is valid and worth showing to the user or not.
 */
const isValidUppyError = (error: NonNullable<UploadContextState['error']>) => {
  return error.details !== 'Upload cancelled';
};

export function FileUploadProvider({
  assetId,
  locale,
  autoProceed,
  onUploadComplete,
  onBatchUploadComplete,
  children,
  allowedFileTypes,
  maxNumberOfFiles,
  setValue,
}: PropsWithChildren<FileUploadProviderProps>) {
  const { client, spaceId, environmentId } = useContentfulContext();

  const uppy = useRef(
    new Uppy<Meta, Body>({
      id: `${assetId}:contentful-upload-provider`,
      allowMultipleUploadBatches: true,
      autoProceed,
      restrictions: {
        maxNumberOfFiles,
        maxFileSize: 1024 * 1024 * 1000,
        allowedFileTypes,
      },
      onBeforeFileAdded: () => {
        // Allow duplicate files upload
        // https://uppy.io/docs/uppy/#how-do-i-allow-duplicate-files
        return true;
      },
    })
  );

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [totalProgress, setTotalProgress] = useState<number>(0);
  const [error, setError] = useState<UploadContextState['error']>(null);

  useEffect(() => {
    const contentfulPlugin = uppy.current.getPlugin('contentful');

    if (contentfulPlugin) {
      return;
    }

    uppy.current.use(ContentfulAssetPlugin, {
      id: 'contentful',
      client,
      contentful: {
        assetId,
        spaceId,
        environmentId,
        locale,
        setValue,
      },
    });
  }, [assetId, client, spaceId, environmentId, locale, setValue]);

  useEffect(() => {
    function onError(error: Error) {
      setIsUploading(false);

      uppy.current.getFiles().forEach((file) => {
        uppy.current.removeFile(file.id);
      });

      if (isValidUppyError(error)) {
        setError(error);
      }
    }
    function onFileAdded() {
      setError(null);
    }
    function onUploadStart() {
      setTotalProgress(0);
      setIsUploading(true);
    }

    function onCancelAll() {
      setTotalProgress(0);
      setIsUploading(false);
      setError(null);
    }

    function onComplete(result: UploadResult<Meta, Body>) {
      if (result.successful?.length) {
        setTotalProgress(100);
        setIsUploading(false);

        result.successful.forEach(() => {
          onUploadComplete?.();
        });

        onBatchUploadComplete?.();
      }
    }

    uppy.current.on('error', onError);
    uppy.current.on('file-added', onFileAdded);
    uppy.current.on('upload', onUploadStart);
    uppy.current.on('cancel-all', onCancelAll);
    uppy.current.on('complete', onComplete);

    const uppyToCleanUp = uppy.current;

    return () => {
      uppyToCleanUp.off('error', onError);
      uppyToCleanUp.off('file-added', onFileAdded);
      uppyToCleanUp.off('upload', onUploadStart);
      uppyToCleanUp.off('cancel-all', onCancelAll);
      uppyToCleanUp.off('complete', onComplete);
      if (Object.keys(uppyToCleanUp.getState().currentUploads).length > 0) {
        uppyToCleanUp.cancelAll();
      }
    };
  }, [onUploadComplete, onBatchUploadComplete]);

  const value = useMemo(
    (): UploadContextState => ({
      uppy: uppy.current,
      error,
      isUploading,
      totalProgress,
    }),
    [error, isUploading, totalProgress]
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}
