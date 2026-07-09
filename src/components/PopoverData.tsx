import { FC } from 'react';
import { SysType } from '../types/contentfulTypes';
import { format as timeAgo } from 'timeago.js';

interface PopoverDataProps {
  sys: SysType;
  size?: string;
  fileName?: string;
  slug?: string;
}

const PopoverData: FC<PopoverDataProps> = ({ sys, size, fileName, slug }) => (
  <div className="pop-over">
    <span>{`ID: ${sys.id}`}</span>
    <span>{`Created: ${timeAgo(sys.createdAt || '')}`}</span>
    <span>{`Revision: ${String(sys.revision)}`}</span>
    <span>{`Space: ${sys.space.sys.id}`}</span>
    <span>{`Environment: ${sys.environment.sys.id}`}</span>
    {size ? <span>{`Size: ${size}`}</span> : null}
    {fileName ? <span>{`File name: ${fileName}`}</span> : null}
    {slug ? <span>{`Slug: ${slug}`}</span> : null}
  </div>
);

export default PopoverData;
