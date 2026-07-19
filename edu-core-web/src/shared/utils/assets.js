/**
 * Resolves a relative backend file path into a fully qualified absolute URL pointing to the API server
 *
 * @param {string} url - Relative asset path (e.g., '/uploads/teachers/cv/filename.docx')
 * @returns {string} - Full absolute URL
 */
export const resolveAssetUrl = (url) => {
  if (!url) return '';

  // If it's already an absolute URL, return it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Resolve base API URL domain
  const viteApiUrl = import.meta.env.VITE_API_BASE_URL;
  const reactApiUrl = import.meta.env.REACT_APP_API_URL;
  const apiBase = viteApiUrl || reactApiUrl || 'http://localhost:5000/api';

  // Remove trailing /api/v1 or /api or /v1 to get the root host
  const host = apiBase
    .replace(/\/v1$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/api$/, '')
    .replace(/\/$/, '');

  // Ensure we have a leading slash
  const relativePath = url.startsWith('/') ? url : `/${url}`;

  return `${host}${relativePath}`;
};
