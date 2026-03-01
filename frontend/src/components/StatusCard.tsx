import { AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import { PipelineData } from '../types';
import { PressureGraph } from './PressureGraph';
import { usePressureHistory } from '../hooks/usePressureHistory';
import { FlowRateCard } from './FlowRateCard';
import { calculateFlowDifference } from '../utils/flowUtils';

interface StatusCardProps {
  data: PipelineData;
}

export function StatusCard({ data }: StatusCardProps) {
  const flowDiff = calculateFlowDifference(data.flowRate1, data.flowRate2);
  const history = usePressureHistory(data.flowRate1, data.flowRate2);
  
  const getStatusColor = () => {
    switch (data.status) {
      case 'critical':
        return 'bg-red-50 border-red-500 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-500 text-yellow-700';
      default:
        return 'bg-green-50 border-green-500 text-green-700';
    }
  };

  const StatusIcon = () => {
    switch (data.status) {
      case 'critical':
        return <AlertOctagon className="w-6 h-6" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${getStatusColor()} transition-all duration-300 shadow-sm hover:shadow-md`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-lg tracking-tight">{data.zone}</h3>
          <p className="text-sm opacity-75 mt-0.5">{data.location}</p>
        </div>
        <div className="p-2 rounded-lg">
          <StatusIcon />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <FlowRateCard label="Flow Rate 1" value={data.flowRate1} />
        <FlowRateCard label="Flow Rate 2" value={data.flowRate2} />
      </div>

      <div className="rounded-lg p-4 mb-10">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-sm">Flow Rate History</h4>
          <div className="text-xs font-medium px-2 py-1 rounded-full">
            Last {history.length} readings
          </div>
        </div>
        <div className="h-[180px]">
          <PressureGraph data={history} height={180} />
        </div>
      </div>
      
      <div className="border-t border-current/10 pt-4 mt-20">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Flow Rate Difference</span>
          <span className="font-bold text-lg">{flowDiff.toFixed(1)} L/s</span>
        </div>
        <p className="text-xs opacity-75">
          Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}