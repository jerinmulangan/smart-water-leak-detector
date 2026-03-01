export function generateRandomFlow(currentFlow: number): number {
  return Math.max(0, currentFlow + (Math.random() * 20 - 10));
}

export function calculateFlowDifference(flow1: number, flow2: number): number {
  return Math.abs(flow1 - flow2);
}

export function getSystemStatus(flowDiff: number): SystemStatus {
  if (flowDiff > 50) {
    return { 
      status: 'critical',
      message: 'Critical flow rate difference detected'
    };
  }
  if (flowDiff > 30) {
    return { 
      status: 'warning',
      message: 'High flow rate difference detected'
    };
  }
  return { 
    status: 'normal',
    message: 'System operating normally'
  };
}