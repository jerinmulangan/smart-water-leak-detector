export function generateRandomPressure(currentPressure: number): number {
  return Math.max(0, currentPressure + (Math.random() * 10 - 5));
}

export function calculatePressureDifference(pressure1: number, pressure2: number): number {
  return Math.abs(pressure1 - pressure2);
}