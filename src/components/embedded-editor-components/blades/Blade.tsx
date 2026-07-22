import { useEffect } from 'react';
import { css } from '@emotion/react';
import { useTransitionState } from 'react-transition-state';
import { useBladesContext, BladeContext } from './BladesProvider';
import { BladeData } from './types';
import { InBladeEntryEditor } from '../EntryEditor';
import { InBladeAssetEditor } from '../AssetEditor';

type BladeProps = {
  data: BladeData;
  index: number;
};

const bladeStyles = (index: number) => css`
  z-index: ${100 * index};
  inset: 0 0 0 ${index * 30}px;
  position: fixed;
  width: calc(100vw - ${index * 30}px);
  height: 100vh;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  overflow: auto;

  &[data-transition-state='entering'],
  &[data-transition-state='entered'] {
    transform: translateX(0);
  }

  &[data-transition-state='exiting'] {
    transform: translateX(100%);
  }
`;

export const Blade = ({ data, index }: BladeProps) => {
  const { closeBlade, setBladeResult } = useBladesContext();

  const [{ status }, toggle] = useTransitionState({
    timeout: 300,
    preEnter: true,
    mountOnEnter: true,
    unmountOnExit: true,
  });

  useEffect(() => {
    toggle(true);
    return () => toggle(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BladeContext.Provider value={{ index, data, close: closeBlade, setBladeResult }}>
      <div css={bladeStyles(index + 1)} data-transition-state={status}>
        {data.entityType === 'entry' ? <InBladeEntryEditor /> : <InBladeAssetEditor />}
      </div>
    </BladeContext.Provider>
  );
};
