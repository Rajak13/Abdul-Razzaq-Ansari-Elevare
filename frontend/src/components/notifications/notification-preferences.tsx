'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TestTube } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { useNotifications } from '../../hooks/use-notifications';
import { NotificationType, NotificationPreferencesData } from '../../types/notification';

interface NotificationPreferencesProps {
  onBack: () => void;
  onClose?: () => void;
}

const notificationTypeLabels = {
  [NotificationType.TASK_DEADLINE]: {
    label: 'Task Deadlines',
    description: 'Get notified when your tasks are due soon',
  },
  [NotificationType.GROUP_MESSAGE]: {
    label: 'Group Messages',
    description: 'Receive notifications for new messages in your study groups',
  },
  [NotificationType.JOIN_REQUEST_RECEIVED]: {
    label: 'Join Requests Received',
    description: 'Get notified when someone requests to join your study groups',
  },
  [NotificationType.JOIN_REQUEST_APPROVED]: {
    label: 'Join Requests',
    description: 'Get notified when your join requests are approved',
  },
  [NotificationType.RESOURCE_COMMENT]: {
    label: 'Resource Comments',
    description: 'Receive notifications when someone comments on your resources',
  },
  [NotificationType.SYSTEM_UPDATE]: {
    label: 'System Updates',
    description: 'Important system announcements and updates',
  },
};

export function NotificationPreferences({ onBack, onClose }: NotificationPreferencesProps) {
  const {
    preferences,
    isConnected,
    updatePreferences,
    sendTestNotification,
    isUpdatingPreferences,
    isSendingTest,
  } = useNotifications();

  const [localPreferences, setLocalPreferences] = useState<NotificationPreferencesData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local preferences from server data
  useEffect(() => {
    const prefs: NotificationPreferencesData = {};
    
    // Set defaults for all notification types
    Object.values(NotificationType).forEach(type => {
      prefs[type] = true; // Default to enabled
    });

    // Override with server preferences
    preferences.forEach(pref => {
      prefs[pref.notification_type] = pref.enabled;
    });

    setLocalPreferences(prefs);
  }, [preferences]);

  const handlePreferenceChange = (type: NotificationType, enabled: boolean) => {
    const newPreferences = {
      ...localPreferences,
      [type]: enabled,
    };
    setLocalPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updatePreferences(localPreferences);
    setHasChanges(false);
  };

  const handleTestNotification = () => {
    sendTestNotification();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">Notification Settings</h3>
        {!isConnected && (
          <Badge variant="outline" className="text-xs">
            Offline
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Connection Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Connection Status</Label>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected - Real-time notifications enabled' : 'Disconnected - Only email notifications available'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Test Notification */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Test Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Send a test notification to verify your settings are working.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={isSendingTest}
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isSendingTest ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </div>

        <Separator />

        {/* Notification Preferences */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Notification Types</Label>
          
          {Object.entries(notificationTypeLabels).map(([type, config]) => (
            <div key={type} className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor={type} className="text-sm font-medium cursor-pointer">
                  {config.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {config.description}
                </p>
              </div>
              <Switch
                id={type}
                checked={localPreferences[type] || false}
                onCheckedChange={(checked) => handlePreferenceChange(type as NotificationType, checked)}
                disabled={isUpdatingPreferences}
              />
            </div>
          ))}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isUpdatingPreferences}
                className="flex-1"
              >
                {isUpdatingPreferences ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Reset to server state
                  const prefs: NotificationPreferencesData = {};
                  Object.values(NotificationType).forEach(type => {
                    prefs[type] = true;
                  });
                  preferences.forEach(pref => {
                    prefs[pref.notification_type] = pref.enabled;
                  });
                  setLocalPreferences(prefs);
                  setHasChanges(false);
                }}
                disabled={isUpdatingPreferences}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}