export interface MapOut {
  map_id: string; // UUID as string
  file_key: string;
  sha256: string;
  source: string;
  region: string;
  category: string;
  caption?: {
    cap_id: string; // UUID as string
    map_id: string; // UUID as string
    generated: string;
    edited?: string;
    accuracy?: number;
    context?: number;
    usability?: number;
  };
} 