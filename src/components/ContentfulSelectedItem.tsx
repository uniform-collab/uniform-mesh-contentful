import { Popover, Chip, ChipTheme, Button } from '@uniformdev/design-system';
import {
  ObjectSearchResultItemProps,
  useObjectSearchContext,
  useUniformMeshSdk,
  LinkButton,
} from '@uniformdev/mesh-sdk-react';
import { format as timeagoFormat } from 'timeago.js';

import * as styles from './ContentfulObjectSearchResultItem.styles';
import LogoIcon from '../../public/contentful-badge.svg';
import { css } from '@emotion/react';

const PUBLISH_STATUS_CHIP_THEME: Record<string, ChipTheme> = {
  success: 'utility-success',
  error: 'utility-danger',
  info: 'utility-info',
  note: 'utility-caution',
};

export const ContentfulSelectedItem = ({
  id,
  title,
  contentType,
  popoverData,
  publishStatus,
  editLink,
  imageUrl,
  onRemove,
  createdAt,
  editLinkIcon,
  publishedAt,
  hideRemoveButton = false,
  disableDnD = false,
  children,
  reloadEntries,
  embeddedEditorEnabled,
}: ObjectSearchResultItemProps & { reloadEntries?: () => void; embeddedEditorEnabled?: boolean }) => {
  const sdk = useUniformMeshSdk();

  const { onSelectItem } = useObjectSearchContext();
  const formatedContentType = Array.isArray(contentType) ? contentType.join(', ') : contentType;

  const onRemoveItem = () => {
    onSelectItem({ id, title: id });
    onRemove?.();
  };

  return (
    <div css={styles.ObjectSearchResultItemContainer} data-testid="search-result-item">
      {disableDnD ? null : (
        <div role="presentation" className="drag-handle" css={styles.ObjectSearchDragHandle}></div>
      )}
      <div>
        <div css={styles.ObjectSearchContentContainer}>
          {!imageUrl ? null : (
            <img src={imageUrl} alt={`Thumbnail for ${title}`} css={styles.ObjectSearchImage} />
          )}
          <div>
            <span css={styles.ObjectSearchResultItemSubtitle} data-testid="sub-title">
              {formatedContentType}
            </span>
            <span role="heading" css={styles.ObjectSearchResultItemTitle} data-testid="title">
              {title}
              {!popoverData ? null : (
                <Popover ariaLabel={title} buttonText={`See ${title} details`}>
                  {popoverData}
                </Popover>
              )}
            </span>
            {!createdAt && !publishStatus ? null : (
              <div css={styles.ObjectSearchAuthorStateGroup}>
                {!publishStatus?.text ? null : (
                  <Chip
                    text={publishStatus.text}
                    size="xs"
                    theme={PUBLISH_STATUS_CHIP_THEME[publishStatus.theme as string] ?? 'neutral-light'}
                  />
                )}
                {!createdAt && !publishedAt ? null : (
                  <div css={styles.ObjectSearchUpdateGroup}>
                    {!createdAt ? null : (
                      <small css={styles.ObjectSearchResultItemTimeStamp}>
                        <strong>Last updated: </strong>
                        {timeagoFormat(createdAt)}
                      </small>
                    )}
                    {!publishedAt ? null : (
                      <small css={styles.ObjectSearchResultItemTimeStamp}>
                        <strong>Last published: </strong>
                        {timeagoFormat(publishedAt)}
                      </small>
                    )}
                  </div>
                )}
              </div>
            )}
            <div>{children}</div>
          </div>
        </div>
      </div>
      {!editLink && hideRemoveButton ? null : (
        <div css={styles.ObjectSearchAuthorStateGroup}>
          {embeddedEditorEnabled ? (
            <Button
              size="sm"
              buttonType="tertiaryOutline"
              onClick={async () => {
                await sdk.openLocationDialog({
                  locationKey: 'embeddedEditor',
                  options: {
                    params: {
                      title: `Embedded editor for "${title}"`,
                      variables: { entryIds: id },
                      actionType: 'edit',
                    },
                  },
                });
                reloadEntries?.();
              }}
            >
              <img
                src={LogoIcon.src}
                css={css`
                  width: 1rem;
                  height: 1rem;
                `}
              />
              Edit
            </Button>
          ) : (
            <LinkButton text="Edit" href={editLink} icon={editLinkIcon} />
          )}
          {hideRemoveButton ? null : (
            <Button buttonType="ghostDestructive" onClick={onRemoveItem}>
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
