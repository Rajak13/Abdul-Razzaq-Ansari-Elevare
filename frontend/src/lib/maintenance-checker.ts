import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface MaintenanceStatus {
  enabled: boolean;
  message?: string;
  enabled_at?: string;
  estimated_duration?: number;
}

/**
 * Check if the system is in maintenance mode
 * This is a lightweight check that doesn't require authentication
 */
export async function checkMaintenanceMode(): Promise<MaintenanceStatus> {
  try {
    const response = await axios.get(`${API_URL}/api/system/maintenance-status`, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    // If the endpoint doesn't exist or fails, assume no maintenance
    return { enabled: false };
  }
}

/**
 * Check if the current user is an admin
 * Admins should bypass maintenance mode
 */
export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    // Decode JWT token to check role
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin' || payload.role === 'owner';
  } catch {
    return false;
  }
}
