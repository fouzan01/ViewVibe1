export const isNewDay = (lastTimestamp?: number) => {
  if (!lastTimestamp) return true;
  const lastDate = new Date(lastTimestamp);
  const nowDate = new Date();
  return (
    lastDate.getDate() !== nowDate.getDate() ||
    lastDate.getMonth() !== nowDate.getMonth() ||
    lastDate.getFullYear() !== nowDate.getFullYear()
  );
};

export const isNewWeek = (lastTimestamp?: number) => {
  if (!lastTimestamp) return true;
  
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const lastMonday = getMonday(new Date(lastTimestamp));
  const nowMonday = getMonday(new Date());
  
  return lastMonday.getTime() !== nowMonday.getTime();
};

export const isNewMonth = (lastTimestamp?: number) => {
  if (!lastTimestamp) return true;
  const lastDate = new Date(lastTimestamp);
  const nowDate = new Date();
  return (
    lastDate.getMonth() !== nowDate.getMonth() ||
    lastDate.getFullYear() !== nowDate.getFullYear()
  );
};

export const formatWatchTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};
