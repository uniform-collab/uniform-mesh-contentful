import { PropsWithChildren, useState, useCallback, useEffect } from 'react';
import { createContext, useContext } from 'react';
import { css } from '@emotion/react';
import { Blade } from './Blade';
import { BladeData, BladeResult, BladeContextValue, BladesContextValue } from './types';

type BladeInstance = {
  data: BladeData;
  resolve: (result: BladeResult<unknown>) => void;
  result?: unknown;
};

export const BladesContext = createContext<BladesContextValue | undefined>(undefined);
export const BladeContext = createContext<BladeContextValue | undefined>(undefined);

export const useBladesContext = () => {
  const context = useContext(BladesContext);
  if (!context) {
    throw new Error('useBladesContext must be used within BladesProvider');
  }
  return context;
};

export const useBladeContext = () => {
  const context = useContext(BladeContext);
  if (!context) {
    throw new Error('useBladeContext must be used within Blade component');
  }
  return context;
};

export const BladesProvider = ({ children }: PropsWithChildren) => {
  const [bladeInstances, setBladeInstances] = useState<BladeInstance[]>([]);

  const openBlade = useCallback(<T,>(data: BladeData): Promise<BladeResult<T>> => {
    return new Promise((resolve) => {
      setBladeInstances((prev) => [...prev, { data, resolve } as BladeInstance]);
    });
  }, []);

  const closeBlade = useCallback(() => {
    setBladeInstances((prev) => {
      const lastBlade = prev[prev.length - 1];
      if (lastBlade) {
        lastBlade.resolve({ success: lastBlade.result !== undefined, data: lastBlade.result });
      }
      return prev.slice(0, -1);
    });
  }, []);

  const closeAll = useCallback(() => {
    setBladeInstances((prev) => {
      prev.forEach((blade) => {
        blade.resolve({ success: blade.result !== undefined, data: blade.result });
      });
      return [];
    });
  }, []);

  const setBladeResult = useCallback((result: unknown) => {
    setBladeInstances((prev) => {
      const lastBlade = prev[prev.length - 1];
      if (lastBlade) {
        lastBlade.result = result;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (bladeInstances.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [bladeInstances.length]);

  return (
    <BladesContext.Provider
      value={{
        blades: bladeInstances.map((i) => i.data),
        openBlade,
        closeBlade,
        closeAll,
        setBladeResult,
      }}
    >
      {children}
      {bladeInstances.length > 0 ? (
        <div>
          <div
            onClick={closeAll}
            css={css`
              /* Matches Contentful dialog backdrop */
              background: rgba(12, 20, 28, 0.74902);
              cursor: pointer;
              inset: 0;
              position: fixed;
              transition: opacity 200ms ease-in-out;
              z-index: 2;
            `}
          ></div>
          {bladeInstances.map((instance, index) => (
            <Blade key={`${instance.data.entityId}-${index}`} data={instance.data} index={index + 1} />
          ))}
        </div>
      ) : null}
    </BladesContext.Provider>
  );
};
