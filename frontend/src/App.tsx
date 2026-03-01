import React from 'react';
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { DetailPanel } from './components/DetailPanel';
import { mockPipelineData } from './data';
import { useDataUpdates } from './hooks/useDataUpdates';

export function App() {
  const [pipelineData, setPipelineData] = React.useState([mockPipelineData[0]]);
  useDataUpdates(setPipelineData);

  // LED logic
  const data = pipelineData[0];
  const flowDiff = Math.abs(data.flowRate1 - data.flowRate2);
  const isRed = flowDiff > 20;
  const isYellow = data.flowRate1 === 0 || data.flowRate2 === 0;
  const isGreen = !isRed && !isYellow;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {/* LED Status Bar - moved outside and below navbar */}
      <div className="w-full flex justify-center py-3 mt-1">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <span className={`w-5 h-5 rounded-full mb-1 border-2 border-green-500 transition-all duration-200 ${isGreen ? 'bg-green-400 shadow-[0_0_12px_4px_rgba(34,197,94,0.7)]' : 'bg-gray-200'}`}></span>
            <span className="text-xs text-gray-700">Normal</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`w-5 h-5 rounded-full mb-1 border-2 border-yellow-400 transition-all duration-200 ${isYellow ? 'bg-yellow-300 shadow-[0_0_12px_4px_rgba(253,224,71,0.7)]' : 'bg-gray-200'}`}></span>
            <span className="text-xs text-gray-700">No Data</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`w-5 h-5 rounded-full mb-1 border-2 border-red-500 transition-all duration-200 ${isRed ? 'bg-red-500 shadow-[0_0_12px_4px_rgba(239,68,68,0.7)]' : 'bg-gray-200'}`}></span>
            <span className="text-xs text-gray-700">Red Alert</span>
          </div>
        </div>
      </div>
      {/* End LED Status Bar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StatusCard data={pipelineData[0]} />
          </div>
          <div>
            <DetailPanel data={pipelineData[0]} />
          </div>
        </div>
      </main>
    </div>
  );
}