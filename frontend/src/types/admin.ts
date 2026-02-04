// Admin authentication types
export interface AdminUser {
  id: string;
  email: string;
  role: 'owner' | 'administrator' | 'moderator';
  mfaEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export interface AdminSession {
  admin: AdminUser;
  expiresAt: Date;
}

export interface LoginResponse {
  requiresOtp: boolean;
  email: string;
}

export interface OtpVerificationResponse {
  token: string;
  admin: AdminUser;
}

// System metrics types
export interface OverviewMetrics {
  totalUsers: number;
  activeUsersDaily: number;
  activeUsersWeekly: number;
  activeUsersMonthly: number;
  totalTasks: number;
  totalNotes: number;
  totalFiles: number;
  totalResources: number;
  storageUsed: number;
  apiResponseTime: number;
  errorRate: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export interface UserStatistics {
  totalUsers: number;
  newRegistrations: number;
  activeUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  usersByRole: Record<string, number>;
  registrationTrend: Array<{ date: string; count: number }>;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
  slowestEndpoints: Array<{
    endpoint: string;
    avgResponseTime: number;
    requestCount: number;
  }>;
  errorsByEndpoint: Array<{
    endpoint: string;
    errorCount: number;
    errorRate: number;
  }>;
}

export interface StorageMetrics {
  totalStorage: number;
  storageByType: {
    tasks: number;
    notes: number;
    files: number;
    resources: number;
    whiteboards: number;
  };
  storageGrowth: Array<{ date: string; size: number }>;
}

export interface SecurityMetrics {
  failedLoginAttempts: number;
  blockedIpAddresses: number;
  suspiciousActivities: number;
  securityAlerts: number;
  recentThreats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }>;
}

// User management types
export interface UserAccount {
  id: string;
  email: string;
  registrationDate: Date;
  lastLogin?: Date;
  status: 'active' | 'suspended' | 'deleted';
  suspensionReason?: string;
  suspensionExpiry?: Date;
  violationCount: number;
}

export interface UserDetail extends UserAccount {
  loginHistory: Array<{
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
  }>;
  violationHistory: Array<{
    type: string;
    reason: string;
    timestamp: Date;
    moderatorId: string;
  }>;
  accountStats: {
    totalTasks: number;
    totalNotes: number;
    totalFiles: number;
    storageUsed: number;
  };
}

// Moderation types
export interface AbuseReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  contentType: string;
  contentId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  moderatorId?: string;
  actionTaken?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ViolationHistory {
  userId: string;
  violations: Array<{
    id: string;
    type: string;
    reason: string;
    action: string;
    timestamp: Date;
    moderatorId: string;
  }>;
  totalViolations: number;
  lastViolation?: Date;
}

// Configuration types
export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
}

export interface SystemConfig {
  maxFileUploadSize: number;
  maxUsersPerGroup: number;
  rateLimitPerMinute: number;
  sessionTimeout: number;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

// Audit types
export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  actionType: string;
  targetEntity: string;
  targetId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Security types
export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress?: string;
  userId?: string;
  timestamp: Date;
  resolved: boolean;
}

export interface ThreatIndicator {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastOccurrence: Date;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
