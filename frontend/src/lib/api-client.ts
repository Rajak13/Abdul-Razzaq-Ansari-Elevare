import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds to handle cold starts
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

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
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

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          localStorage.setItem('auth_token', token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.location.href = `/${locale}/login`;
        return Promise.reject(refreshError);
      }
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
