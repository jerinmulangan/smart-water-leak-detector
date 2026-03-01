export function generateRandomTemperature(): number {
  return 20 + Math.random() * 10;
}

export function isTemperatureNormal(temperature: number): boolean {
  return temperature >= 15 && temperature <= 35;
}