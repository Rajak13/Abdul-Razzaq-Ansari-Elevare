'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { Settings, Flag, AlertCircle, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminConfigurationPage() {
  const queryClient = useQueryClient();
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [maxUsersPerGroup, setMaxUsersPerGroup] = useState(50);
  const [rateLimit, setRateLimit] = useState(100);

  const { data: featureFlags, isLoading: loadingFlags } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => adminApiClient.getFeatureFlags(),
  });

  const { data: systemConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['admin-system-config'],
    queryFn: () => adminApiClient.getSystemConfig(),
  });

  const updateFlagsMutation = useMutation({
    mutationFn: (flags: Record<string, boolean>) =>
      adminApiClient.updateFeatureFlags(flags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flags updated successfully');
    },
    onError: () => {
      toast.error('Failed to update feature flags');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Record<string, any>) =>
      adminApiClient.updateSystemConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-config'] });
      toast.success('System configuration updated successfully');
    },
    onError: () => {
      toast.error('Failed to update system configuration');
    },
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? adminApiClient.enableMaintenanceMode('System maintenance in progress')
        : adminApiClient.disableMaintenanceMode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-config'] });
      toast.success('Maintenance mode updated successfully');
    },
  });

  const handleSaveSettings = () => {
    updateConfigMutation.mutate({
      maxFileUploadSize: maxFileSize,
      maxUsersPerGroup: maxUsersPerGroup,
      rateLimitPerMinute: rateLimit,
    });
  };

  return (
    <AdminRouteGuard requiredRole="owner">
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">System Configuration</h1>
              <p className="text-sm text-[#717171]">Manage feature flags, system settings, and maintenance mode</p>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Flag className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Feature Flags</h2>
                  <p className="text-sm text-[#717171]">Enable or disable platform features</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loadingFlags ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(142,71%,45%)]"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {featureFlags?.flags?.map((flag: any) => (
                    <div
                      key={flag.name}
                      className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-[#1A1A1A]">{flag.name}</p>
                        <p className="text-sm text-[#717171] mt-1">{flag.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          updateFlagsMutation.mutate({
                            [flag.name]: !flag.enabled,
                          });
                        }}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          flag.enabled ? 'bg-[hsl(142,71%,45%)]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            flag.enabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">System Settings</h2>
                  <p className="text-sm text-[#717171]">Configure system limits and parameters</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {loadingConfig ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(142,71%,45%)]"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                        Max File Upload Size (MB)
                      </label>
                      <input
                        type="number"
                        value={maxFileSize}
                        onChange={(e) => setMaxFileSize(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                        Max Users Per Group
                      </label>
                      <input
                        type="number"
                        value={maxUsersPerGroup}
                        onChange={(e) => setMaxUsersPerGroup(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Rate Limit (requests per minute)
                    </label>
                    <input
                      type="number"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    disabled={updateConfigMutation.isPending}
                    className="w-full py-3 px-4 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(142,71%,45%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Maintenance Mode</h2>
                  <p className="text-sm text-[#717171]">Enable maintenance mode to restrict user access</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-xl">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Maintenance Mode</p>
                  <p className="text-sm text-[#717171] mt-1">
                    Prevent users from accessing the platform during maintenance
                  </p>
                </div>
                <button
                  onClick={() => {
                    toggleMaintenanceMutation.mutate(!(systemConfig?.maintenanceMode || false));
                  }}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    systemConfig?.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      systemConfig?.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {systemConfig?.maintenanceMode && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-semibold text-red-900">⚠️ Maintenance Mode is Active</p>
                  <p className="text-sm text-red-700 mt-1">
                    Users are currently unable to access the platform. Disable maintenance mode to restore access.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRouteGuard>
  );
}
