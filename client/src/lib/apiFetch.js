const FRONTEND_PORTS = new Set(['3000', '3001']);
const BACKEND_PORTS = ['5001', '5000'];

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const isLocalHostname = (hostname = '') =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

const isLikelyFrontendOrigin = (origin) => {
  try {
    const url = new URL(origin);
    if (isLocalHostname(url.hostname) && FRONTEND_PORTS.has(url.port)) return true;
    return /-(3000|3001)\./.test(url.hostname);
  } catch {
    return false;
  }
};

const toOrigin = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const value = raw.trim();
    if (!value) return null;
    const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;
    const url = new URL(withProtocol);
    return trimTrailingSlash(url.origin);
  } catch {
    return null;
  }
};

const addUnique = (list, origin) => {
  if (origin && !list.includes(origin)) {
    list.push(origin);
  }
};

const addBackendCandidates = (list, origin) => {
  if (!origin) return;
  try {
    const url = new URL(origin);
    const { protocol, hostname, port } = url;

    if (hostname.includes('devtunnels.ms') && /-\d+\./.test(hostname)) {
      const backendHost = hostname.replace(/-\d+\./, '-5001.');
      addUnique(list, `${protocol}//${backendHost}`);
    }

    if (isLocalHostname(hostname) && (FRONTEND_PORTS.has(port) || !port)) {
      BACKEND_PORTS.forEach((backendPort) => {
        addUnique(list, `${protocol}//${hostname}:${backendPort}`);
      });
    }
  } catch {
    // Ignore malformed fallback source
  }
};

const normalizeApiPath = (path = '') => {
  if (!path) return '/api';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/api' || normalized.startsWith('/api/')) return normalized;
  return `/api${normalized}`;
};

export const getApiOrigins = () => {
  const origins = [];
  const envOrigin = toOrigin(process.env.NEXT_PUBLIC_API_URL);

  addBackendCandidates(origins, envOrigin);
  addUnique(origins, envOrigin);

  if (typeof window !== 'undefined') {
    const browserOrigin = toOrigin(window.location.origin);
    addBackendCandidates(origins, browserOrigin);
    addUnique(origins, browserOrigin);
  }

  addUnique(origins, 'http://localhost:5001');
  addUnique(origins, 'http://127.0.0.1:5001');
  addUnique(origins, 'http://localhost:5000');
  addUnique(origins, 'http://127.0.0.1:5000');

  return origins;
};

export const getApiOrigin = () => getApiOrigins()[0] || 'http://localhost:5001';

export const buildApiUrl = (path, origin = getApiOrigin()) => {
  return `${trimTrailingSlash(origin)}${normalizeApiPath(path)}`;
};

export const apiFetch = async (path, init) => {
  const origins = getApiOrigins();
  let lastNetworkError = null;

  for (let index = 0; index < origins.length; index += 1) {
    const origin = origins[index];
    const url = buildApiUrl(path, origin);

    try {
      const response = await fetch(url, init);
      if (
        response.ok ||
        (response.status >= 400 && response.status < 500 && !isLikelyFrontendOrigin(origin)) ||
        index === origins.length - 1
      ) {
        return response;
      }
    } catch (error) {
      lastNetworkError = error;
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  throw new Error('Unable to reach API');
};
