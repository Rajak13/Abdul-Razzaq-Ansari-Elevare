import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

class AdminApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/admin`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - redirect to login
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('admin_token', token);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('admin_token');
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async verifyOtp(email: string, otp: string) {
    const response = await this.client.post('/auth/verify-otp', { email, otp });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async getSession() {
    const response = await this.client.get('/auth/session');
    // Transform the session response to match frontend expectations
    if (response.data.success && response.data.admin) {
      return {
        admin: {
          id: response.data.admin.id,
          email: response.data.admin.email,
          role: response.data.admin.role,
          mfaEnabled: response.data.admin.mfa_enabled,
          lastLogin: new Date(),
          createdAt: new Date()
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      };
    }
    return response.data;
  }

  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  // System metrics endpoints
  async getOverviewMetrics() {
    const response = await this.client.get('/metrics/overview');
    const data = response.data.data;

    // Transform the API response to match frontend expectations
    return {
      totalUsers: data.users?.total_users || 0,
      activeUsersDaily: data.users?.active_users_daily || 0,
      activeUsersWeekly: data.users?.active_users_weekly || 0,
      activeUsersMonthly: data.users?.active_users_monthly || 0,
      totalTasks: data.content?.total_tasks || 0,
      totalNotes: data.content?.total_notes || 0,
      totalFiles: data.content?.total_files || 0,
      totalResources: data.content?.total_resources || 0,
      totalGroups: data.content?.total_study_groups || 0,
      storageUsed: data.storage?.total_storage || 0,
      apiResponseTime: 150, // Mock value - could be calculated from system metrics
      errorRate: 0.01, // Mock value - could be calculated from system metrics
      systemHealth: data.meets_threshold ? 'healthy' : 'degraded',
      // Include raw data for other components that might need it
      rawData: data
    };
  }

  async getUserStatistics(params?: { timeframe?: string }) {
    const response = await this.client.get('/metrics/users', { params });
    return response.data.data || response.data;
  }

  async getPerformanceMetrics(params?: { timeframe?: string }) {
    const response = await this.client.get('/metrics/performance', { params });
    return response.data.data || response.data;
  }

  async getStorageMetrics() {
    const response = await this.client.get('/metrics/storage');
    return response.data.data || response.data;
  }

  async getSecurityMetrics(params?: { timeframe?: string }) {
    const response = await this.client.get('/metrics/security', { params });
    return response.data;
  }

  // User management endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const response = await this.client.get('/users', { params });
    return response.data.data || response.data;
  }

  async getUserById(userId: string) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data.data || response.data;
  }

  async suspendUser(userId: string, reason: string, duration?: number) {
    console.log('🚫 Admin: Suspending user', { userId, reason, duration });
    try {
      const response = await this.client.put(`/users/${userId}/suspend`, {
        reason,
        duration,
      });
      console.log('✅ Admin: User suspended successfully', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Admin: Failed to suspend user', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async unsuspendUser(userId: string, reason: string = 'Administrative action') {
    console.log('✅ Admin: Unsuspending user', { userId, reason });
    try {
      const response = await this.client.put(`/users/${userId}/unsuspend`, { reason });
      console.log('✅ Admin: User unsuspended successfully', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Admin: Failed to unsuspend user', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async resetUserPassword(userId: string) {
    console.log('🔑 Admin: Resetting user password', { userId });
    try {
      const response = await this.client.post(`/users/${userId}/reset-password`);
      console.log('✅ Admin: Password reset successfully', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Admin: Failed to reset password', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async deleteUser(userId: string, reason: string) {
    console.log('🗑️ Admin: Deleting user', { userId, reason });
    try {
      const response = await this.client.delete(`/users/${userId}`, {
        data: { reason },
      });
      console.log('✅ Admin: User deleted successfully', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Admin: Failed to delete user', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Moderation endpoints
  async getAbuseReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await this.client.get('/moderation/reports', { params });
    return response.data;
  }

  async updateAbuseReport(
    reportId: string,
    action: string,
    notes?: string
  ) {
    const response = await this.client.put(`/moderation/reports/${reportId}`, {
      action,
      notes,
    });
    return response.data;
  }

  async getViolationHistory(userId: string) {
    const response = await this.client.get(`/moderation/violations/${userId}`);
    return response.data;
  }

  async issueWarning(userId: string, reason: string) {
    const response = await this.client.post('/moderation/warnings', {
      userId,
      reason,
    });
    return response.data;
  }

  // Configuration endpoints
  async getFeatureFlags() {
    const response = await this.client.get('/config/features');
    return response.data;
  }

  async updateFeatureFlags(flags: Record<string, boolean>) {
    const response = await this.client.put('/config/features', { flags });
    return response.data;
  }

  async getSystemConfig() {
    const response = await this.client.get('/config/system');
    return response.data.data || response.data;
  }

  async updateSystemConfig(configOrKey: Record<string, any> | string, value?: any) {
    if (typeof configOrKey === 'string') {
      // Single key update
      const response = await this.client.put(`/config/system/${configOrKey}`, { value });
      return response.data.data || response.data;
    } else {
      // Batch update - update each key individually
      const config = configOrKey;
      const results = [];
      for (const [key, val] of Object.entries(config)) {
        try {
          const response = await this.client.put(`/config/system/${key}`, { value: val });
          results.push(response.data.data || response.data);
        } catch (error) {
          console.error(`Failed to update config key ${key}:`, error);
        }
      }
      return { success: true, updated: results.length };
    }
  }

  async enableMaintenanceMode(message: string, estimatedDuration?: number) {
    const response = await this.client.post('/config/maintenance', {
      message,
      estimatedDuration,
    });
    return response.data;
  }

  async disableMaintenanceMode() {
    const response = await this.client.delete('/config/maintenance');
    return response.data;
  }

  // Audit and compliance endpoints
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    adminId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/audit/logs', { params });
    return response.data;
  }

  async searchAuditLogs(query: string, params?: Record<string, any>) {
    const response = await this.client.get('/audit/search', {
      params: { query, ...params },
    });
    return response.data;
  }

  async generateComplianceReport(type: string, params?: Record<string, any>) {
    const response = await this.client.post('/compliance/reports', {
      type,
      ...params,
    });
    return response.data;
  }

  async getGdprComplianceStatus() {
    const response = await this.client.get('/compliance/gdpr');
    return response.data;
  }

  async exportUserData(userId: string) {
    const response = await this.client.post('/compliance/data-export', {
      userId,
    });
    return response.data;
  }

  // Security monitoring endpoints
  async getSecurityEvents(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/security/events', { params });
    return response.data;
  }

  async getThreatIndicators() {
    const response = await this.client.get('/security/threats');
    return response.data;
  }

  async blockIpAddress(ipAddress: string, reason: string, duration?: number) {
    const response = await this.client.post('/security/block-ip', {
      ipAddress,
      reason,
      duration,
    });
    return response.data;
  }

  async getFailedLoginAttempts(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/security/failed-logins', {
      params,
    });
    return response.data;
  }

  // Suspension Appeals endpoints
  async getAppeals(params?: { status?: string; page?: number; limit?: number }) {
    const response = await this.client.get('/appeals', { params });
    return response.data;
  }

  async getAppealStatistics() {
    const response = await this.client.get('/appeals/statistics');
    return response.data;
  }

  async getAppealById(appealId: string) {
    const response = await this.client.get(`/appeals/${appealId}`);
    return response.data;
  }

  async reviewAppeal(appealId: string, data: { status: string; admin_response: string }) {
    const response = await this.client.put(`/appeals/${appealId}/review`, data);
    return response.data;
  }
}

export const adminApiClient = new AdminApiClient();
