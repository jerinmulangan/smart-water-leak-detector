export interface PipelineData {
  id: string;
  zone: string;
  type: 'industrial' | 'domestic' | 'commercial';
  flowRate1: number;
  flowRate2: number;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
  location: string;
  maintenanceHistory: MaintenanceRecord[];
  temperature: number;
}

export interface PressureHistory {
  pressure1: number,
  pressure2: number,
  timestamp:string
}

export interface FlowHistory {
  flowRate1: number;
  flowRate2: number;
  timestamp: string;
}

export interface MaintenanceRecord {
  date: string;
  type: string;
  notes: string;
}

export interface SystemStatus {
  status: 'normal' | 'warning' | 'critical';
  message?: string;
}