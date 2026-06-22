export interface HydratedSetActual {
  value: string;
  rpe: string;
  note: string;
}

export interface WorkoutLogSet {
  blockIndex: number;
  itemIndex: number;
  setIndex: number;
  value: number;
  rpe?: number;
  note?: string;
}

export interface WorkoutLogCheckpoint {
  activeBlock: number;
  focusedItemIndex: number;
  savedAt: number;
}

export interface WorkoutLogSnapshot {
  sets: WorkoutLogSet[];
  checkpoint?: WorkoutLogCheckpoint;
}

interface PlanBlock {
  items: Array<{ sets: number }>;
}

export interface HydrateResult {
  actuals: Record<string, HydratedSetActual>;
  loggedSets: Set<string>;
  completedBlocks: Set<number>;
  activeBlock: number;
  focusedItemIndex: number;
}

function isBlockComplete(
  blockIdx: number,
  loggedSets: Set<string>,
  blocks: PlanBlock[],
): boolean {
  const block = blocks[blockIdx];
  if (!block) return false;
  for (let i = 0; i < block.items.length; i++) {
    for (let s = 0; s < block.items[i].sets; s++) {
      if (!loggedSets.has(`${blockIdx}|${i}|${s}`)) return false;
    }
  }
  return true;
}

function firstIncompleteBlock(loggedSets: Set<string>, blocks: PlanBlock[]): number {
  for (let b = 0; b < blocks.length; b++) {
    if (!isBlockComplete(b, loggedSets, blocks)) return b;
  }
  return Math.max(0, blocks.length - 1);
}

export function hydrateFromLog(
  log: WorkoutLogSnapshot | null | undefined,
  blocks: PlanBlock[],
): HydrateResult | null {
  if (!log || !Array.isArray(log.sets) || log.sets.length === 0) {
    if (log?.checkpoint && blocks.length > 0) {
      const { activeBlock, focusedItemIndex } = log.checkpoint;
      const safeBlock = Math.min(Math.max(0, activeBlock), blocks.length - 1);
      const itemCount = blocks[safeBlock]?.items.length ?? 1;
      return {
        actuals: {},
        loggedSets: new Set(),
        completedBlocks: new Set(),
        activeBlock: safeBlock,
        focusedItemIndex: Math.min(Math.max(0, focusedItemIndex), itemCount - 1),
      };
    }
    return null;
  }

  const actuals: Record<string, HydratedSetActual> = {};
  const loggedSets = new Set<string>();

  for (const s of log.sets) {
    const key = `${s.blockIndex}|${s.itemIndex}|${s.setIndex}`;
    loggedSets.add(key);
    actuals[key] = {
      value: String(s.value),
      rpe: s.rpe != null ? String(s.rpe) : "",
      note: s.note ?? "",
    };
  }

  const completedBlocks = new Set<number>();
  for (let b = 0; b < blocks.length; b++) {
    if (isBlockComplete(b, loggedSets, blocks)) completedBlocks.add(b);
  }

  let activeBlock = firstIncompleteBlock(loggedSets, blocks);
  let focusedItemIndex = 0;

  if (log.checkpoint) {
    const { activeBlock: savedBlock, focusedItemIndex: savedItem } = log.checkpoint;
    if (savedBlock >= 0 && savedBlock < blocks.length) {
      activeBlock = savedBlock;
      const itemCount = blocks[savedBlock].items.length;
      focusedItemIndex = Math.min(Math.max(0, savedItem), itemCount - 1);
    }
  }

  return { actuals, loggedSets, completedBlocks, activeBlock, focusedItemIndex };
}