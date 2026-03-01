import React, { useState } from 'react';
import { Settings, AlertCircle, Droplets } from 'lucide-react';
import { PipelineData } from '../types';
import { calculatePressureDifference } from '../utils/pressureUtils';
import { useFlowHistory } from '../hooks/usePressureHistory';

interface DetailPanelProps {
  data: PipelineData;
}

export function DetailPanel({ data }: DetailPanelProps) {
  // Red zone if flowrate difference > 20
  const flowDiff = Math.abs(data.flowRate1 - data.flowRate2);
  const isRedZone = flowDiff > 20;
  const [modalOpen, setModalOpen] = useState(false);

  // Average flowrate is (flowRate1 + flowRate2) / 2, live from data
  const avgFlow = (data.flowRate1 + data.flowRate2) / 2;

  React.useEffect(() => {
    if (isRedZone) setModalOpen(true);
  }, [isRedZone]);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold tracking-tight text-gray-900">System Details</h3>
          <Settings className="w-6 h-6 text-gray-300" />
        </div>
        <hr className="my-2 border-gray-200" />
        <div className="flex flex-col items-center justify-center py-6">
          <Droplets className="w-12 h-12 text-blue-500 mb-2" />
          <div className="text-4xl font-extrabold text-blue-700 mb-1">{avgFlow.toFixed(1)} <span className="text-2xl font-medium text-blue-400">L/s</span></div>
          <div className="text-base text-gray-600 font-medium">Current Average Flow Rate</div>
        </div>
        <hr className="my-2 border-gray-200" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Last Maintenance</p>
            <p className="font-medium">2 days ago</p>
          </div>
          <div>
            <p className="text-gray-500">Next Inspection</p>
            <p className="font-medium">In 5 days</p>
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-lg w-full relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-r from-red-600 to-red-400 p-6">
              <AlertCircle className="w-14 h-14 text-white animate-pulse mb-2 drop-shadow-lg" />
              <h2 className="text-2xl font-extrabold text-white mb-1 text-center drop-shadow">Critical Flow Rate Alert</h2>
              <p className="text-base text-red-100 text-center mb-2 font-medium drop-shadow">
                The flow rate difference is dangerously high. Please review the system details below.
              </p>
            </div>
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-white bg-red-500 hover:bg-red-700 rounded-full w-9 h-9 flex items-center justify-center text-2xl shadow-lg transition"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              style={{lineHeight: 1}}
            >
              ×
            </button>
            {/* Modal Content */}
            <div className="p-8 pt-6 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-gray-700">Zone:</span> <span className="text-gray-900">{data.zone}</span></div>
                <div><span className="font-semibold text-gray-700">Location:</span> <span className="text-gray-900">{data.location}</span></div>
                <div><span className="font-semibold text-gray-700">Flow Rate 1:</span> <span className="text-gray-900">{data.flowRate1.toFixed(1)} L/s</span></div>
                <div><span className="font-semibold text-gray-700">Flow Rate 2:</span> <span className="text-gray-900">{data.flowRate2.toFixed(1)} L/s</span></div>
                <div><span className="font-semibold text-gray-700">Flow Rate Difference:</span> <span className="text-red-600 font-bold">{flowDiff.toFixed(1)} L/s</span></div>
                <div><span className="font-semibold text-gray-700">Average Flow Rate:</span> <span className="text-gray-900">{avgFlow.toFixed(1)} L/s</span></div>
                <div><span className="font-semibold text-gray-700">Status:</span> <span className="text-gray-900">{data.status}</span></div>
                <div><span className="font-semibold text-gray-700">Last Maintenance:</span> <span className="text-gray-900">2 days ago</span></div>
                <div><span className="font-semibold text-gray-700">Next Inspection:</span> <span className="text-gray-900">In 5 days</span></div>
                <div className="col-span-2"><span className="font-semibold text-gray-700">Timestamp:</span> <span className="text-gray-900">{new Date(data.timestamp).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}