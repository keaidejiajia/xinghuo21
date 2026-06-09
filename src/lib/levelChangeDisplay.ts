import type { CardSide, LevelChange } from '../types';

export type LevelChangeDisplayTone = 'up' | 'down' | 'flip' | 'neutral';

export interface LevelChangeDisplayInput {
  fromSide: CardSide;
  toSide: CardSide;
  fromLevel: number;
  toLevel: number;
}

export interface LevelChangeDisplay {
  label: string;
  tone: LevelChangeDisplayTone;
}

export function formatLevelChangeDisplay(change: LevelChangeDisplayInput | LevelChange): LevelChangeDisplay {
  if (change.fromSide !== change.toSide) {
    return { label: '↻翻面', tone: 'flip' };
  }

  if (change.fromLevel === change.toLevel) {
    return { label: `L${change.toLevel}`, tone: 'neutral' };
  }

  const isRise =
    change.fromSide === 'front'
      ? change.toLevel < change.fromLevel
      : change.toLevel > change.fromLevel;

  return {
    label: `${isRise ? '↑升' : '↓降'}L${change.toLevel}`,
    tone: isRise ? 'up' : 'down',
  };
}
