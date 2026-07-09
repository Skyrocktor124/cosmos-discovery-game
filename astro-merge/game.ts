// Core 2048-style merge logic, UI-independent and unit-testable.

export const SIZE = 4;
export type Grid = number[][]; // 0 = empty, 1..MAX_LEVEL = tile level

export const MAX_LEVEL = 11;

export interface MoveResult {
  grid: Grid;
  moved: boolean;
  scoreGained: number;
}

export const emptyGrid = (): Grid =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

export const cloneGrid = (g: Grid): Grid => g.map(row => [...row]);

const slideRowLeft = (row: number[]): { row: number[]; moved: boolean; gained: number } => {
  const tiles = row.filter(v => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1] && tiles[i] < MAX_LEVEL) {
      const merged = tiles[i] + 1;
      out.push(merged);
      gained += 2 ** merged;
      i++; // skip the merged partner
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  const moved = out.some((v, i) => v !== row[i]);
  return { row: out, moved, gained };
};

const transpose = (g: Grid): Grid =>
  g[0].map((_, c) => g.map(row => row[c]));

const reverseRows = (g: Grid): Grid => g.map(row => [...row].reverse());

export type Direction = 'left' | 'right' | 'up' | 'down';

export const move = (grid: Grid, dir: Direction): MoveResult => {
  // Normalize every direction to a "slide left", then undo the transform.
  let g = cloneGrid(grid);
  if (dir === 'up') g = transpose(g);
  if (dir === 'down') g = reverseRows(transpose(g));
  if (dir === 'right') g = reverseRows(g);

  let moved = false;
  let scoreGained = 0;
  g = g.map(row => {
    const r = slideRowLeft(row);
    if (r.moved) moved = true;
    scoreGained += r.gained;
    return r.row;
  });

  if (dir === 'up') g = transpose(g);
  if (dir === 'down') g = transpose(reverseRows(g));
  if (dir === 'right') g = reverseRows(g);

  return { grid: g, moved, scoreGained };
};

export const spawnTile = (grid: Grid, rand: () => number = Math.random): Grid => {
  const empties: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (empties.length === 0) return grid;
  const [r, c] = empties[Math.floor(rand() * empties.length)];
  const g = cloneGrid(grid);
  g[r][c] = rand() < 0.9 ? 1 : 2;
  return g;
};

export const hasMoves = (grid: Grid): boolean => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
};

export const newGame = (rand: () => number = Math.random): Grid =>
  spawnTile(spawnTile(emptyGrid(), rand), rand);
