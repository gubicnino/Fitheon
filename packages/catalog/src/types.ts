export type Quality = 1 | 2 | 3 | 4;
export type Category = 'free_weights' | 'bench' | 'press' | 'rack' | 'pull' | 'cardio' | 'machine' | 'decor';
export type GymId = 'garage' | 'neighbourhood' | 'commercial' | 'elite';
export type SizeClass = 0.5 | 1 | 1.5;
export type StyleKind = 'floor' | 'wall';

export type QualityTier = { quality: Quality; name: string; playerLevel: number; stepPrice: number };

export type MachineLine = {
  id: string; name: string; categories: Category[];
  startQuality: Quality; unlockLevel: number; sizeClass: SizeClass;
  flatPrice: number | null;        // set for decor: fixed price, not upgradable
};

export type Slot = { id: string; zone: string; accepts: Category[] };
export type Style = { id: string; kind: StyleKind; name: string; price: number };

export type Gym = {
  id: GymId; name: string; order: number; levelGate: number; moveCost: number;
  qualityCap: Quality; slots: Slot[]; styles: Style[];
};
