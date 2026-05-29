// Centralized Operational Gateway API Base URL
// Switches dynamically depending on active deployment domain
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `${window.location.origin.replace('3000', '5000')}/api`; // Or fallback dynamically to port 5000 on host redirects

export const isGoogleDriveUrl = (url) => {
  return typeof url === 'string' && url.includes('drive.google.com');
};

export const getGoogleDriveFileId = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Format: drive.google.com/file/d/FILE_ID/view...
  if (url.includes('/file/d/')) {
    const parts = url.split('/file/d/');
    if (parts[1]) {
      return parts[1].split('/')[0].split('?')[0].split('&')[0];
    }
  }
  
  // Format: drive.google.com/uc?id=FILE_ID or open?id=FILE_ID...
  if (url.includes('id=')) {
    const parts = url.split('id=');
    if (parts[1]) {
      return parts[1].split('&')[0].split('#')[0];
    }
  }
  
  return null;
};

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (isGoogleDriveUrl(url)) {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  return url;
};

export const getGoogleDriveEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (isGoogleDriveUrl(url)) {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }
  return null;
};export const detectGoogleDriveUrl = (text) => {
  if (typeof text !== 'string') return null;
  const match = text.match(/https:\/\/drive\.google\.com\/[^\s]+/);
  return match ? match[0] : null;
};
