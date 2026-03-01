import { useState, useEffect } from 'react';
import { PressureHistory } from '../types';

const MAX_HISTORY_POINTS = 200;

export function usePressureHistory(pressure1: number, pressure2: number) {
  const [history, setHistory] = useState<PressureHistory[]>([]);

  useEffect(() => {
    setHistory(prev => {
      const newPoint = {
        pressure1,
        pressure2,
        timestamp: new Date().toISOString()
      };
      
      const updated = [...prev, newPoint];
      return updated.slice(-MAX_HISTORY_POINTS);
    });
  }, [pressure1, pressure2]);

  return history;
}

export function useFlowHistory(flowRate1: number, flowRate2: number) {
  const [history, setHistory] = useState<{ flowRate1: number; flowRate2: number; timestamp: string }[]>([]);

  useEffect(() => {
    setHistory(prev => {
      const newPoint = {
        flowRate1,
        flowRate2,
        timestamp: new Date().toISOString()
      };
      const updated = [...prev, newPoint];
      return updated.slice(-MAX_HISTORY_POINTS);
    });
  }, [flowRate1, flowRate2]);

  return history;
}