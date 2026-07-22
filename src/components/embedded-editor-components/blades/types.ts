export type BladeData = {
  entityId: string;
  entityType: string;
  locale: string;
};

export type BladeResult<T> = {
  success: boolean;
  data?: T;
};

export type BladeContextValue<T = unknown> = {
  index: number;
  data: BladeData;
  close: () => void;
  setBladeResult: (result: T) => void;
};

export type BladesContextValue<T = unknown> = {
  blades: BladeData[];
  openBlade: <T>(data: BladeData) => Promise<BladeResult<T>>;
  closeBlade: () => void;
  closeAll: () => void;
  setBladeResult: (result: T) => void;
};
