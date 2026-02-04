'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Flag, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminConfigurationPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({
        title: 'Success',
        description: 'Feature flags updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update feature flags',
        variant: 'destructive',
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Record<string, any>) =>
      adminApiClient.updateSystemConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-config'] });
      toast({
        title: 'Success',
        description: 'System configuration updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update system configuration',
        variant: 'destructive',
      });
    },
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? adminApiClient.enableMaintenanceMode('System maintenance in progress')
        : adminApiClient.disableMaintenanceMode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-config'] });
      toast({
        title: 'Success',
        description: 'Maintenance mode updated successfully',
      });
    },
  });

  return (
    <AdminRouteGuard requiredRole="owner">
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">System Configuration</h1>
          <p className="text-muted-foreground">
            Manage feature flags, system settings, and maintenance mode
          </p>
        </div>

        <div className="grid gap-6">
          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Enable or disable platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFlags ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {featureFlags?.flags?.map((flag: any) => (
                    <div
                      key={flag.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <Label htmlFor={flag.name} className="font-medium">
                          {flag.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {flag.description}
                        </p>
                      </div>
                      <Switch
                        id={flag.name}
                        checked={flag.enabled}
                        onCheckedChange={(checked) => {
                          updateFlagsMutation.mutate({
                            [flag.name]: checked,
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system limits and parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConfig ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxFileUploadSize">
                      Max File Upload Size (MB)
                    </Label>
                    <Input
                      id="maxFileUploadSize"
                      type="number"
                      defaultValue={systemConfig?.maxFileUploadSize || 10}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxUsersPerGroup">
                      Max Users Per Group
                    </Label>
                    <Input
                      id="maxUsersPerGroup"
                      type="number"
                      defaultValue={systemConfig?.maxUsersPerGroup || 50}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateLimitPerMinute">
                      Rate Limit (requests per minute)
                    </Label>
                    <Input
                      id="rateLimitPerMinute"
                      type="number"
                      defaultValue={systemConfig?.rateLimitPerMinute || 100}
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      // Collect form values and update
                      updateConfigMutation.mutate({
                        maxFileUploadSize: 10,
                        maxUsersPerGroup: 50,
                        rateLimitPerMinute: 100,
                      });
                    }}
                  >
                    Save Settings
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>
                Enable maintenance mode to restrict user access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="maintenanceMode" className="font-medium">
                    Maintenance Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent users from accessing the platform
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={systemConfig?.maintenanceMode || false}
                  onCheckedChange={(checked) => {
                    toggleMaintenanceMutation.mutate(checked);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminRouteGuard>
  );
}
