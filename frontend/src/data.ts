import { PipelineData } from './types';

export const mockPipelineData: PipelineData[] = [
  {
    id: '1',
    zone: 'North Industrial',
    type: 'industrial',
    flowRate1: 85,
    flowRate2: 80,
    temperature: 25,
    timestamp: new Date().toISOString(),
    status: 'normal',
    location: 'Sector A-1',
    maintenanceHistory: [
      { date: '2024-03-10', type: 'Inspection', notes: 'Regular maintenance check' },
      { date: '2024-02-25', type: 'Repair', notes: 'Valve replacement' }
    ]
  }
];