import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Create axios instance
// ✅ SECURITY: Enable credentials to send HttpOnly cookies
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ SECURITY: Send cookies with every request
  timeout: 180000, // 180 seconds (3 minutes) to handle geographic latency
});

// Add request timing for debugging
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // @ts-ignore - Add timestamp for performance tracking
    config.metadata = { startTime: new Date() };
    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => {
    // @ts-ignore
    const duration = new Date() - response.config.metadata.startTime;
    if (duration > 5000) {
      console.warn(`Slow API call: ${response.config.url} took ${duration}ms`);
    }
    return response;
  }
);

// ❌ REMOVED: Request interceptor that added Authorization header from localStorage
// Tokens are now sent automatically as HttpOnly cookies

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 503 Maintenance Mode
    if (error.response?.status === 503) {
      const errorData = error.response.data as any;
      if (errorData?.error?.code === 'MAINTENANCE_MODE') {
        // Redirect to maintenance page
        const locale = window.location.pathname.split('/')[1] || 'en';
        if (!window.location.pathname.includes('/maintenance')) {
          window.location.href = `/${locale}/maintenance`;
        }
        return Promise.reject(error);
      }
    }

    // Handle 401 Unauthorized - Session expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // ✅ SECURITY: Cookies are handled by the browser, just redirect to login
      // No need to manually refresh tokens - backend manages cookie lifecycle
      const locale = window.location.pathname.split('/')[1] || 'en';
      window.location.href = `/${locale}/login`;
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;


/**
 * Submit a report for content
 */
export async function submitReport(
  contentType: 'resource' | 'group' | 'message' | 'comment',
  contentId: string,
  reason: string,
  description?: string
): Promise<void> {
  const endpoint = `/reports/${contentType}/${contentId}`;
  
  await apiClient.post(endpoint, {
    reason,
    description
  });
}
