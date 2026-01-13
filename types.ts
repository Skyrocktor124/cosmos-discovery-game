export enum DiscoveryType {
  PLANET = 'PLANET',
  STAR = 'STAR',
  NEBULA = 'NEBULA',
  ANOMALY = 'ANOMALY'
}

export interface CelestialBody {
  id: string;
  name: string;
  type: DiscoveryType;
  description: string;
  colorPrimary: string; // Hex code
  colorSecondary: string; // Hex code
  atmosphere: string;
  resources: string[];
  habitability: number; // 0-100
  distanceLightYears: number;
  imageUrl?: string;
}

export interface SectorNode {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  size: number; // Scale factor
  color: string;
  visited: boolean;
  data?: CelestialBody;
}

export interface PlayerState {
  science: number;
  fuel: number;
  visitedCount: number;
  currentSector: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'discovery';
}