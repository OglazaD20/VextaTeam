/**
 * Triangular XP curve — each level costs more than the last (level N needs
 * 100*N more cumulative XP than level N-1), a standard, predictable RPG
 * curve rather than an arbitrary one.
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * ((n * (n + 1)) / 2);
}

export function computeLevel(xp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  pctToNextLevel: number;
}

export function computeLevelProgress(xp: number): LevelProgress {
  const level = computeLevel(xp);
  const floor = xpRequiredForLevel(level);
  const ceiling = xpRequiredForLevel(level + 1);
  const xpIntoLevel = xp - floor;
  const xpForNextLevel = ceiling - floor;

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    pctToNextLevel: xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 100,
  };
}
