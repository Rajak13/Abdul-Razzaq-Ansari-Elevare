'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { Settings, Flag, AlertCircle, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminConfigurationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'features' | 'system' | 'maintenance'>('features');
  
  // Feature flag modal state
  const [featureFlagModal, setFeatureFlagModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<any>(null);
  const [flagName, setFlagName] = useState('');
  const [flagDescription, setFlagDescription] = useState('');
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagRollout, setFlagRollout] = useState(100);

  // System config state
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [maxUsersPerGroup, setMaxUsersPerGroup] = useState(50);
  const [rateLimit, setRateLimit] = useState(100);
  const [sessionTimeout, setSessionTimeout] = useState(2);
  const [maxFailedLogins, setMaxFailedLogins] = useState(5);
  const [lockDuration, setLockDuration] = useState(30);

  const { data: featureFlags, isLoading: loadingFlags } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => adminApiClient.getFeatureFlags(),
  });

  const { data: systemConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['admin-system-config'],
    queryFn: () => adminApiClient.getSystemConfig(),
  });

  const { data: systemLimits, isLoading: loadingLimits } = useQuery({
    queryKey: ['admin-system-limits'],
    queryFn: () => adminApiClient.getSystemLimits(),
  });

  const { data: maintenanceMode } = useQuery({
    queryKey: ['admin-maintenance-mode'],
    queryFn: () => adminApiClient.getMaintenanceMode(),
  });

  // Load system limits into state
  useEffect(() => {
    if (systemLimits?.data) {
      const limits = systemLimits.data;
      setMaxFileSize(limits.max_file_upload_size || 10);
      setRateLimit(limits.rate_limit_requests_per_minute || 100);
      setSessionTimeout(limits.session_timeout_hours || 2);
      setMaxFailedLogins(limits.max_failed_login_attempts || 5);
      setLockDuration(limits.account_lock_duration_minutes || 30);
    }
  }, [systemLimits]);

  const createFlagMutation = useMutation({
    mutationFn: (data: any) => adminApiClient.createFeatureFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag created successfully');
      closeFeatureFlagModal();
    },
    onError: () => {
      toast.error('Failed to create feature flag');
    },
  });

  const updateFlagMutation = useMutation({
    mutationFn: ({ name, updates }: { name: string; updates: any }) =>
      adminApiClient.updateFeatureFlag(name, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag updated successfully');
      closeFeatureFlagModal();
    },
    onError: () => {
      toast.error('Failed to update feature flag');
    },
  });

  const deleteFlagMutation = useMutation({
    mutationFn: (name: string) => adminApiClient.deleteFeatureFlag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete feature flag');
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      adminApiClient.updateFeatureFlag(name, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag toggled successfully');
    },
    onError: () => {
      toast.error('Failed to toggle feature flag');
    },
  });

  const updateLimitsMutation = useMutation({
    mutationFn: (limits: any) => adminApiClient.updateSystemLimits(limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-limits'] });
      toast.success('System limits updated successfully');
    },
    onError: () => {
      toast.error('Failed to update system limits');
    },
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? adminApiClient.enableMaintenanceMode('System maintenance in progress', 120)
        : adminApiClient.disableMaintenanceMode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance-mode'] });
      toast.success('Maintenance mode updated successfully');
    },
    onError: () => {
      toast.error('Failed to update maintenance mode');
    },
  });

  const handleSaveLimits = () => {
    updateLimitsMutation.mutate({
      max_file_upload_size: maxFileSize,
      rate_limit_requests_per_minute: rateLimit,
      session_timeout_hours: sessionTimeout,
      max_failed_login_attempts: maxFailedLogins,
      account_lock_duration_minutes: lockDuration,
    });
  };

  const openFeatureFlagModal = (flag?: any) => {
    if (flag) {
      setEditingFlag(flag);
      setFlagName(flag.name);
      setFlagDescription(flag.description || '');
      setFlagEnabled(flag.enabled);
      setFlagRollout(flag.rollout_percentage || 100);
    } else {
      setEditingFlag(null);
      setFlagName('');
      setFlagDescription('');
      setFlagEnabled(true);
      setFlagRollout(100);
    }
    setFeatureFlagModal(true);
  };

  const closeFeatureFlagModal = () => {
    setFeatureFlagModal(false);
    setEditingFlag(null);
    setFlagName('');
    setFlagDescription('');
    setFlagEnabled(true);
    setFlagRollout(100);
  };

  const handleSaveFeatureFlag = () => {
    if (editingFlag) {
      updateFlagMutation.mutate({
        name: editingFlag.name,
        updates: {
          description: flagDescription,
          enabled: flagEnabled,
          rollout_percentage: flagRollout,
        },
      });
    } else {
      createFlagMutation.mutate({
        name: flagName,
        description: flagDescription,
        enabled: flagEnabled,
        rollout_percentage: flagRollout,
      });
    }
  };

  const flagsList = featureFlags?.data?.features || featureFlags?.features || [];
  const isMaintenanceEnabled = maintenanceMode?.data?.enabled || false;

  return (
    <AdminRouteGuard requiredRole="moderator">
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">System Configuration</h1>
                <p className="text-sm text-[#717171]">Manage feature flags, system settings, and maintenance mode</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('features')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'features'
                    ? 'text-[hsl(142,71%,45%)] border-b-2 border-[hsl(142,71%,45%)]'
                    : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
              >
                Feature Flags
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'system'
                    ? 'text-[hsl(142,71%,45%)] border-b-2 border-[hsl(142,71%,45%)]'
                    : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
              >
                System Limits
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'maintenance'
                    ? 'text-[hsl(142,71%,45%)] border-b-2 border-[hsl(142,71%,45%)]'
                    : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
              >
                Maintenance Mode
              </button>
            </div>

            {/* Feature Flags Tab */}
            {activeTab === 'features' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Flag className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                    <div>
                      <h2 className="text-lg font-bold text-[#1A1A1A]">Feature Flags</h2>
                      <p className="text-sm text-[#717171]">Enable or disable platform features</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openFeatureFlagModal()}
                    className="px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Feature Flag
                  </button>
                </div>

                {loadingFlags ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(142,71%,45%)]"></div>
                  </div>
                ) : flagsList.length === 0 ? (
                  <div className="text-center py-12">
                    <Flag className="w-12 h-12 text-[#717171] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No feature flags</h3>
                    <p className="text-sm text-[#717171]">Create feature flags to control platform features</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flagsList.map((flag: any) => (
                      <div
                        key={flag.id || flag.name}
                        className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-[#1A1A1A]">{flag.name}</p>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              flag.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {flag.enabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                            {flag.rollout_percentage < 100 && (
                              <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                                {flag.rollout_percentage}% ROLLOUT
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#717171]">{flag.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFlagMutation.mutate({ name: flag.name, enabled: !flag.enabled })}
                            disabled={toggleFlagMutation.isPending}
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
                          <button
                            onClick={() => openFeatureFlagModal(flag)}
                            className="p-2 text-[#717171] hover:text-[hsl(142,71%,45%)] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the feature flag "${flag.name}"?`)) {
                                deleteFlagMutation.mutate(flag.name);
                              }
                            }}
                            disabled={deleteFlagMutation.isPending}
                            className="p-2 text-[#717171] hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* System Limits Tab */}
            {activeTab === 'system' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                  <div>
                    <h2 className="text-lg font-bold text-[#1A1A1A]">System Limits</h2>
                    <p className="text-sm text-[#717171]">Configure system limits and parameters</p>
                  </div>
                </div>

                {loadingLimits ? (
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
                          min={1}
                          className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Rate Limit (requests per minute)
                        </label>
                        <input
                          type="number"
                          value={rateLimit}
                          onChange={(e) => setRateLimit(Number(e.target.value))}
                          min={1}
                          className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Session Timeout (hours)
                        </label>
                        <input
                          type="number"
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(Number(e.target.value))}
                          min={1}
                          className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Max Failed Login Attempts
                        </label>
                        <input
                          type="number"
                          value={maxFailedLogins}
                          onChange={(e) => setMaxFailedLogins(Number(e.target.value))}
                          min={1}
                          className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Account Lock Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={lockDuration}
                          onChange={(e) => setLockDuration(Number(e.target.value))}
                          min={1}
                          className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveLimits}
                      disabled={updateLimitsMutation.isPending}
                      className="w-full py-3 px-4 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(142,71%,45%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateLimitsMutation.isPending ? 'Saving...' : 'Save System Limits'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Mode Tab */}
            {activeTab === 'maintenance' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                  <div>
                    <h2 className="text-lg font-bold text-[#1A1A1A]">Maintenance Mode</h2>
                    <p className="text-sm text-[#717171]">Enable maintenance mode to restrict user access</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-xl">
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">Maintenance Mode</p>
                      <p className="text-sm text-[#717171] mt-1">
                        Prevent users from accessing the platform during maintenance
                      </p>
                    </div>
                    <button
                      onClick={() => toggleMaintenanceMutation.mutate(!isMaintenanceEnabled)}
                      disabled={toggleMaintenanceMutation.isPending}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        isMaintenanceEnabled ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          isMaintenanceEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {isMaintenanceEnabled && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm font-semibold text-red-900">⚠️ Maintenance Mode is Active</p>
                      <p className="text-sm text-red-700 mt-1">
                        Users are currently unable to access the platform. Disable maintenance mode to restore access.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Flag Modal */}
        {featureFlagModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-[#1A1A1A]">
                  {editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
                </h2>
                <p className="text-sm text-[#717171] mt-1">
                  {editingFlag ? 'Update feature flag settings' : 'Add a new feature flag to control platform features'}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Flag Name
                  </label>
                  <input
                    type="text"
                    value={flagName}
                    onChange={(e) => setFlagName(e.target.value)}
                    disabled={!!editingFlag}
                    placeholder="feature_name"
                    className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={flagDescription}
                    onChange={(e) => setFlagDescription(e.target.value)}
                    placeholder="Describe what this feature flag controls..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Rollout Percentage
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      value={flagRollout}
                      onChange={(e) => setFlagRollout(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-[#1A1A1A] w-12">{flagRollout}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-xl">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">Enabled</p>
                    <p className="text-xs text-[#717171]">Feature is active for users</p>
                  </div>
                  <button
                    onClick={() => setFlagEnabled(!flagEnabled)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      flagEnabled ? 'bg-[hsl(142,71%,45%)]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        flagEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center gap-3">
                <button
                  onClick={closeFeatureFlagModal}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFeatureFlag}
                  disabled={!flagName || (createFlagMutation.isPending || updateFlagMutation.isPending)}
                  className="flex-1 px-4 py-2.5 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(createFlagMutation.isPending || updateFlagMutation.isPending)
                    ? 'Saving...'
                    : editingFlag
                    ? 'Update Flag'
                    : 'Create Flag'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminRouteGuard>
  );
}
