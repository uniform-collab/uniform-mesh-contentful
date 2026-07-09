import { FC } from 'react';
import { ObjectSearchResultItem } from '@uniformdev/mesh-sdk-react';
import LogoIcon from '../../public/contentful-badge.svg';
import { UNKNOWN } from '../constants';
import NoImg from '../../public/no-img.svg';
import { InternalEntry } from '../types/common';

interface SelectedItemComponentProps {
  selectedItem: InternalEntry;
  disableDnD?: boolean;
}

export const SelectedItemComponent: FC<SelectedItemComponentProps> = ({ selectedItem, disableDnD }) => {
  const {
    imageUrl,
    popoverData,
    title,
    id,
    editLink,
    contentType,
    hideRemoveButton = false,
    publishStatus,
    fileUrl,
    createdAt,
  } = selectedItem;
  const url = imageUrl || fileUrl;

  return (
    <ObjectSearchResultItem
      id={id}
      title={title}
      contentType={contentType}
      imageUrl={url !== UNKNOWN ? url : NoImg.src}
      popoverData={popoverData}
      editLink={editLink}
      editLinkIcon={LogoIcon.src}
      hideRemoveButton={hideRemoveButton}
      publishStatus={publishStatus}
      createdAt={createdAt}
      disableDnD={disableDnD}
    />
  );
};
