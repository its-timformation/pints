export function isDealActive(startTime?: string | null, endTime?: string | null): boolean {
  if (!startTime || !endTime) return false;
  
  const now = new Date();
  // Using Paris/Morzine time roughly by using local browser time 
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  
  if (startTime <= endTime) {
    return currentTimeStr >= startTime && currentTimeStr <= endTime;
  } else {
    // Deal goes past midnight
    return currentTimeStr >= startTime || currentTimeStr <= endTime;
  }
}
