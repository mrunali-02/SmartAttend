import api from './api';

export const queueOfflineCheckIn = (payload) => {
  const queue = JSON.parse(localStorage.getItem('offlineCheckIns') || '[]');
  queue.push(payload);
  localStorage.setItem('offlineCheckIns', JSON.stringify(queue));
};

export const getOfflineQueueCount = () => {
  const queue = JSON.parse(localStorage.getItem('offlineCheckIns') || '[]');
  return queue.length;
};

export const syncOfflineRecords = async (onSuccessCallback, onErrorCallback) => {
  if (!navigator.onLine) return 0;
  
  const queue = JSON.parse(localStorage.getItem('offlineCheckIns') || '[]');
  if (queue.length === 0) return 0;

  let successfulUploads = 0;
  const remainingQueue = [];

  for (const item of queue) {
    try {
      // Re-trigger actual check-in endpoint
      await api.post('/attendance/records/mark/', item);
      successfulUploads++;
    } catch (err) {
      console.error('Failed to sync offline record:', err);
      // Keep in queue if it's a transient network fail, otherwise drop if duplicate error
      const statusText = err.response?.data?.error || '';
      if (!statusText.includes('already marked')) {
        remainingQueue.push(item);
      }
    }
  }

  localStorage.setItem('offlineCheckIns', JSON.stringify(remainingQueue));
  
  if (successfulUploads > 0 && onSuccessCallback) {
    onSuccessCallback(successfulUploads);
  }
  if (remainingQueue.length > 0 && onErrorCallback) {
    onErrorCallback(remainingQueue.length);
  }

  return successfulUploads;
};
