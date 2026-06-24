import type { HeatmapDayPoint } from "./cali-analytics-types";

export interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreemapTile {
  day: HeatmapDayPoint;
  dayIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dominancePct: number;
  label: string;
}

const BTC_W = 0.5;
const ETH_H = 0.44;

function worstAspectRatio(areas: number[], side: number): number {
  if (areas.length === 0 || side <= 0) return Infinity;
  const sum = areas.reduce((s, v) => s + v, 0);
  if (sum <= 0) return Infinity;
  const thickness = sum / side;
  let worst = 0;
  for (const area of areas) {
    const length = area / thickness;
    const ratio = Math.max(thickness / length, length / thickness);
    if (ratio > worst) worst = ratio;
  }
  return worst;
}

/**
 * Squarified treemap — weights are normalized to exactly fill [x,y,w,h].
 */
export function squarify(
  weights: number[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect[] {
  const n = weights.length;
  if (n === 0 || w <= 0 || h <= 0) return [];

  const totalWeight = weights.reduce((s, v) => s + v, 0);
  const regionArea = w * h;
  const areas = totalWeight > 0
    ? weights.map((wt) => (wt / totalWeight) * regionArea)
    : weights.map(() => regionArea / n);

  const items = areas.map((area, i) => ({ area, i }));
  items.sort((a, b) => b.area - a.area);

  const rects: TreemapRect[] = new Array(n);
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;
  let cursor = 0;

  while (cursor < n) {
    const horizontal = rw >= rh;
    const side = horizontal ? rw : rh;
    const row: typeof items = [];
    let rowArea = 0;
    let prevWorst = Infinity;

    while (cursor + row.length < n) {
      const candidate = items[cursor + row.length];
      const testAreas = [...row.map((it) => it.area), candidate.area];
      const testWorst = worstAspectRatio(testAreas, side);
      if (testWorst > prevWorst && row.length > 0) break;
      row.push(candidate);
      rowArea += candidate.area;
      prevWorst = testWorst;
    }

    if (row.length === 0) {
      row.push(items[cursor]);
      rowArea = items[cursor].area;
    }

    const thickness = rowArea / side;

    if (horizontal) {
      let cx = rx;
      for (let i = 0; i < row.length; i++) {
        const item = row[i];
        const itemW = (item.area / rowArea) * rw;
        const isLast = i === row.length - 1;
        rects[item.i] = {
          x: cx,
          y: ry,
          w: isLast ? rx + rw - cx : itemW,
          h: thickness,
        };
        cx += itemW;
      }
      ry += thickness;
      rh -= thickness;
    } else {
      let cy = ry;
      for (let i = 0; i < row.length; i++) {
        const item = row[i];
        const itemH = (item.area / rowArea) * rh;
        const isLast = i === row.length - 1;
        rects[item.i] = {
          x: rx,
          y: cy,
          w: thickness,
          h: isLast ? ry + rh - cy : itemH,
        };
        cy += itemH;
      }
      rx += thickness;
      rw -= thickness;
    }

    cursor += row.length;
  }

  snapRectsToBounds(rects, x, y, w, h);
  return rects;
}

/** Eliminate sub-pixel gaps so tiles fully cover the region. */
function snapRectsToBounds(
  rects: TreemapRect[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  for (const r of rects) {
    if (!r) continue;
    r.x = Math.max(x, r.x);
    r.y = Math.max(y, r.y);
    if (r.x + r.w > x + w) r.w = x + w - r.x;
    if (r.y + r.h > y + h) r.h = y + h - r.y;
  }

  if (rects.length === 0) return;

  const maxX = Math.max(...rects.filter(Boolean).map((r) => r.x + r.w));
  const maxY = Math.max(...rects.filter(Boolean).map((r) => r.y + r.h));
  const targetRight = x + w;
  const targetBottom = y + h;

  if (maxX < targetRight - 0.5 || maxY < targetBottom - 0.5) {
    const rightEdge = rects.filter((r) => r && Math.abs(r.x + r.w - maxX) < 1);
    const bottomEdge = rects.filter((r) => r && Math.abs(r.y + r.h - maxY) < 1);
    for (const r of rightEdge) {
      if (r) r.w += targetRight - maxX;
    }
    for (const r of bottomEdge) {
      if (r) r.h += targetBottom - maxY;
    }
  }
}

function recencyWeight(dayIndex: number, total: number): number {
  if (dayIndex === 0) return 0;
  if (dayIndex === 1) return 0;
  if (dayIndex === 2) return Math.pow(total, 1.2) * 2.2;
  if (dayIndex === 3) return Math.pow(total, 1.1) * 1.6;
  return Math.pow(Math.max(1, total - dayIndex + 1), 1.25);
}

function formatDayLabel(dayIndex: number, dateKey: string): string {
  if (dayIndex === 0) return "TODAY";
  if (dayIndex === 1) return "YESTERDAY";
  if (dayIndex === 2) return "2D AGO";
  if (dayIndex === 3) return "3D AGO";
  if (dayIndex <= 6) return `${dayIndex}D AGO`;
  const d = new Date(`${dateKey}T12:00:00Z`);
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

/**
 * Layout remainder cluster Coin360-style:
 * - Days 2-3 get a prominent top band (SOL / BNB slots)
 * - Days 4+ squarified in the lower band, filling all space
 */
function layoutRemainderCluster(
  dayCount: number,
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect[] {
  const rects: TreemapRect[] = new Array(dayCount);

  if (dayCount === 0) return rects;
  if (dayCount === 1) {
    rects[0] = { x, y, w, h };
    return rects;
  }

  if (dayCount === 2) {
    rects[0] = { x, y, w: w * 0.58, h };
    rects[1] = { x: x + w * 0.58, y, w: w * 0.42, h };
    snapRectsToBounds(rects, x, y, w, h);
    return rects;
  }

  const topH = h * 0.36;
  const bottomY = y + topH;
  const bottomH = h - topH;

  rects[0] = { x, y, w: w * 0.56, h: topH };
  rects[1] = { x: x + w * 0.56, y, w: w * 0.44, h: topH * 0.72 };

  const gapX = x + w * 0.56;
  const gapY = y + topH * 0.72;
  const gapW = w * 0.44;
  const gapH = topH * 0.28;
  if (dayCount === 3) {
    rects[2] = { x: gapX, y: gapY, w: gapW, h: gapH };
    snapRectsToBounds(rects, x, y, w, h);
    return rects;
  }

  if (dayCount === 4) {
    rects[2] = { x: gapX, y: gapY, w: gapW * 0.55, h: gapH };
    rects[3] = { x: gapX + gapW * 0.55, y: gapY, w: gapW * 0.45, h: gapH };
    snapRectsToBounds(rects, x, y, w, h);
    return rects;
  }

  if (dayCount >= 5) {
    rects[2] = { x: gapX, y: gapY, w: gapW, h: gapH };

    const bottomCount = dayCount - 3;
    const bottomWeights = Array.from({ length: bottomCount }, (_, i) =>
      recencyWeight(i + 4, dayCount + 3),
    );
    const bottomRects = squarify(bottomWeights, x, bottomY, w, bottomH);

    for (let i = 0; i < bottomCount; i++) {
      rects[i + 3] = bottomRects[i];
    }
  }

  snapRectsToBounds(rects, x, y, w, h);
  return rects;
}

/**
 * Coin360-style layout: Today = BTC (left 50%), Yesterday = ETH (right top 44%),
 * remaining days in SOL/BNB band + squarified lower cluster.
 */
export function layoutCoin360Treemap(
  days: HeatmapDayPoint[],
  width: number,
  height: number,
): TreemapTile[] {
  const n = days.length;
  if (n === 0 || width <= 0 || height <= 0) return [];

  const rects: TreemapRect[] = new Array(n);

  if (n === 1) {
    rects[0] = { x: 0, y: 0, w: width, h: height };
  } else if (n === 2) {
    const half = width * BTC_W;
    rects[0] = { x: 0, y: 0, w: half, h: height };
    rects[1] = { x: half, y: 0, w: width - half, h: height };
  } else {
    const btcW = width * BTC_W;
    const ethH = height * ETH_H;

    rects[0] = { x: 0, y: 0, w: btcW, h: height };
    rects[1] = { x: btcW, y: 0, w: width - btcW, h: ethH };

    const restCount = n - 2;
    const restRects = layoutRemainderCluster(
      restCount,
      btcW,
      ethH,
      width - btcW,
      height - ethH,
    );
    for (let i = 0; i < restCount; i++) {
      rects[i + 2] = restRects[i];
    }
  }

  snapRectsToBounds(rects, 0, 0, width, height);

  const totalArea = width * height;
  return days.map((day, dayIndex) => {
    const r = rects[dayIndex];
    const area = r.w * r.h;
    return {
      day,
      dayIndex,
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      w: Math.round(r.w * 10) / 10,
      h: Math.round(r.h * 10) / 10,
      dominancePct: totalArea > 0 ? Math.round((area / totalArea) * 1000) / 10 : 0,
      label: formatDayLabel(dayIndex, day.dateKey),
    };
  });
}