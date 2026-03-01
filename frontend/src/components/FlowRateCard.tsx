import { Droplets } from 'lucide-react';

interface FlowRateCardProps {
  label: string;
  value: number;
}

export function FlowRateCard({ label, value }: FlowRateCardProps) {
  return (
    <div className="bg-white/40 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Droplets className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-medium opacity-75">{label}</p>
      </div>
      <p className="font-bold text-2xl mt-1">
        {value.toFixed(1)} <span className="text-base font-normal">L/s</span>
      </p>
    </div>
  );
}