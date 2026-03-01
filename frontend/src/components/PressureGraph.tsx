import { PressureHistory } from '../types';

interface PressureGraphProps {
  data: PressureHistory[];
  height?: number;
}

export function PressureGraph({ data, height = 180 }: PressureGraphProps) {
  if (data.length < 2) return null;

  // Function to spread the values randomly within a range
  const spreadData = (value: number) => {
    const spreadFactor = 0.05; // Adjust this to control how much to spread
    const spread = value * spreadFactor;
    return value + (Math.random() * spread * 2 - spread); // Randomly vary the value within ±spread
  };

  // Spread the pressure values
  const spreadDataPoints = data.map(d => ({
    pressure1: spreadData(d.pressure1),
    pressure2: spreadData(d.pressure2),
  }));

  const maxPressure = Math.max(
    ...spreadDataPoints.flatMap(d => [d.pressure1, d.pressure2])
  );
  const minPressure = Math.min(
    ...spreadDataPoints.flatMap(d => [d.pressure1, d.pressure2])
  );
  const range = maxPressure - minPressure;
  const padding = range * 0.1; // Add 10% padding to the top and bottom
  
  const normalize = (value: number) => 
    ((value - (minPressure - padding)) / ((range + 2 * padding) || 1)) * (height - 40);

  const points1 = spreadDataPoints.map((d, i) => 
    `${(i / (spreadDataPoints.length - 1)) * 100},${height - 20 - normalize(d.pressure1)}`
  ).join(' ');
  
  const points2 = spreadDataPoints.map((d, i) => 
    `${(i / (spreadDataPoints.length - 1)) * 100},${height - 20 - normalize(d.pressure2)}`
  ).join(' ');

  // For gradient fill under lines
  const area1 = `0,${height-20} ` + points1 + ` 100,${height-20}`;
  const area2 = `0,${height-20} ` + points2 + ` 100,${height-20}`;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center w-full">
      <div className="w-full relative" style={{height}}>
        <svg width="100%" height={height} className="block">
          {/* Gradients */}
          <defs>
            <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="red-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => (
            <line
              key={idx}
              x1="0" y1={20 + t * (height-40)} x2="100%" y2={20 + t * (height-40)}
              stroke="#e5e7eb" strokeDasharray="4 2" strokeWidth="1" />
          ))}
          {/* Y axis label */}
          <text x="0" y="15" fontSize="12" fill="#6b7280">High</text>
          <text x="0" y={height-5} fontSize="12" fill="#6b7280">Low</text>
          {/* Area under lines */}
          <polygon points={area1} fill="url(#blue-gradient)" />
          <polygon points={area2} fill="url(#red-gradient)" />
          {/* Animated lines */}
          <polyline
            points={points1}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{filter: 'drop-shadow(0 2px 6px #3b82f655)'}}
          >
            <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="1s" fill="freeze" />
          </polyline>
          <polyline
            points={points2}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{filter: 'drop-shadow(0 2px 6px #ef444455)'}}
          >
            <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="1s" fill="freeze" />
          </polyline>
        </svg>
      </div>
      {/* Legend below graph */}
      <div className="flex gap-6 mt-4 text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> FlowRate 1
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> FlowRate 2
        </div>
      </div>
    </div>
  );
}
