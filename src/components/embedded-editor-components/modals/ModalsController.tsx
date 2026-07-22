import { useState, useCallback } from 'react';
import { EntryProps, AssetProps } from 'contentful-management';
import { SelectExistingEntriesModal } from './SelectExistingEntriesModal';
import { createContext, useContext, PropsWithChildren } from 'react';
import { SelectExistingAssetsModal } from './SelectExistingAssetsModal';

export enum ModalType {
  SELECT_EXISTING_ENTRIES = 'SELECT_EXISTING_ENTRIES',
  SELECT_EXISTING_ASSETS = 'SELECT_EXISTING_ASSETS',
}

export const SELECT_EXISTING_ENTRIES = ModalType.SELECT_EXISTING_ENTRIES;
export const SELECT_EXISTING_ASSETS = ModalType.SELECT_EXISTING_ASSETS;
type ModalState = {
  [K in ModalType]:
    | {
        min?: number;
        max?: number;
        locale?: string;
        contentTypes?: string[];
        mimetypeGroups?: string[];
      }
    | false;
};

type ModalControls = {
  openModal: <T extends EntryProps | AssetProps>(
    modalType: ModalType,
    options: ModalState[ModalType]
  ) => Promise<T[]>;
  closeModal: (modalType: ModalType) => void;
};

type ModalsContextValue = ModalControls & {
  modalsState: ModalState;
};

const ModalsContext = createContext<ModalsContextValue | null>(null);

export const ModalsProvider = ({ children }: PropsWithChildren) => {
  const [modalsState, setModalsState] = useState<ModalState>({
    [ModalType.SELECT_EXISTING_ENTRIES]: false,
    [ModalType.SELECT_EXISTING_ASSETS]: false,
  });

  const [resolveMap, setResolveMap] = useState<{
    [K in ModalType]?: (value: EntryProps[] | AssetProps[]) => void;
  }>({});

  const closeModal = useCallback((modalType: ModalType) => {
    setModalsState((prev) => ({
      ...prev,
      [modalType]: false,
    }));
  }, []);

  const openModal = useCallback(
    <T extends EntryProps | AssetProps>(
      modalType: ModalType,
      options: ModalState[ModalType]
    ): Promise<T[]> => {
      return new Promise((resolve) => {
        setModalsState((prev) => ({
          ...prev,
          [modalType]: options,
        }));
        setResolveMap((prev) => ({
          ...prev,
          [modalType]: resolve,
        }));
      });
    },
    []
  );

  const handleConfirm = useCallback(
    (modalType: ModalType, entries: EntryProps[] | AssetProps[]) => {
      resolveMap[modalType]?.(entries);
      closeModal(modalType);
      setResolveMap((prev) => ({
        ...prev,
        [modalType]: undefined,
      }));
    },
    [closeModal, resolveMap]
  );

  return (
    <ModalsContext.Provider
      value={{
        modalsState,
        openModal,
        closeModal,
      }}
    >
      {children}
      <SelectExistingEntriesModal
        isShown={modalsState[ModalType.SELECT_EXISTING_ENTRIES] !== false}
        onCancel={() => closeModal(ModalType.SELECT_EXISTING_ENTRIES)}
        onConfirm={(entries) => handleConfirm(ModalType.SELECT_EXISTING_ENTRIES, entries)}
        {...modalsState[ModalType.SELECT_EXISTING_ENTRIES]}
      />
      <SelectExistingAssetsModal
        isShown={modalsState[ModalType.SELECT_EXISTING_ASSETS] !== false}
        onCancel={() => {
          closeModal(ModalType.SELECT_EXISTING_ASSETS);
        }}
        onConfirm={(assets) => {
          handleConfirm(ModalType.SELECT_EXISTING_ASSETS, assets);
        }}
        {...modalsState[ModalType.SELECT_EXISTING_ASSETS]}
      />
    </ModalsContext.Provider>
  );
};

export const useModals = (): ModalsContextValue => {
  const context = useContext(ModalsContext);
  if (!context) {
    throw new Error('useModals must be used within ModalsProvider');
  }
  return context;
};
