/**
 * Resolves local/relative backend upload URLs to fully qualified URLs.
 * Handles /uploads/... relative paths by checking VITE_API_BASE_URL or defaulting to backend origin.
 */
export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') {
    if (url.image_url) return resolveImageUrl(url.image_url);
    if (url.url) return resolveImageUrl(url.url);
    return '';
  }

  // If already absolute or blob or data URI
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  // Normalize Windows backslashes
  const normalized = url.replace(/\\/g, '/');

  // Handle /uploads/... or uploads/... paths
  if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL;
    if (rawApiUrl) {
      try {
        const parsed = new URL(rawApiUrl, window.location.origin);
        return `${parsed.origin}${cleanPath}`;
      } catch (e) {
        // continue to port fallback
      }
    }
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      if (port === '5173' || port === '3000' || port === '5174') {
        return `http://localhost:8000${cleanPath}`;
      }
    }
    return `http://localhost:8000${cleanPath}`;
  }

  // Handle other relative paths starting with /
  if (normalized.startsWith('/')) {
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL;
    if (rawApiUrl) {
      try {
        const parsed = new URL(rawApiUrl, window.location.origin);
        return `${parsed.origin}${normalized}`;
      } catch (e) {}
    }
    return `http://localhost:8000${normalized}`;
  }

  return normalized;
};

export default resolveImageUrl;
