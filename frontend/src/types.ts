export interface MapOut {
  map_id: string;
  file_key: string;
  sha256: string;
  source: string;
  region: string;
  category: string;
  caption?: {
    cap_id: string;
    map_id: string;
    generated: string;
    edited?: string;
    accuracy?: number;
    context?: number;
    usability?: number;
  };
} 