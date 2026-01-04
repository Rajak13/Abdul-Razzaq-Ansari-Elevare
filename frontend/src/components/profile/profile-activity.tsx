'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, 
  FileText, 
  Video, 
  CheckCircle, 
  MessageSquare,
  Calendar,
  Clock
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'study_group' | 'note' | 'task' | 'video_call' | 'message'
  title: string
  description: string
  timestamp: string
  metadata?: {
    groupName?: string
    participants?: number
    duration?: number
  }
}

const activityIcons = {
  study_group: Users,
  note: FileText,
  task: CheckCircle,
  video_call: Video,
  message: MessageSquare,
}

const activityColors = {
  study_group: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  note: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  task: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  video_call: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  message: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

export function ProfileActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('/api/profile/activity', {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities)
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
        // Set mock data for demonstration
        setActivities([
          {
            id: '1',
            type: 'video_call',
            title: 'Joined video call',
            description: 'Mathematics Study Group - Calculus Review',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            metadata: { groupName: 'Mathematics Study Group', participants: 5, duration: 45 }
          },
          {
            id: '2',
            type: 'task',
            title: 'Completed task',
            description: 'Finish Chapter 5 exercises',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            type: 'note',
            title: 'Created note',
            description: 'Linear Algebra - Eigenvalues and Eigenvectors',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '4',
            type: 'study_group',
            title: 'Joined study group',
            description: 'Physics Study Circle',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { groupName: 'Physics Study Circle' }
          },
          {
            id: '5',
            type: 'message',
            title: 'Posted message',
            description: 'Shared solution to problem set 3',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { groupName: 'Computer Science Group' }
          },
          {
            id: '6',
            type: 'video_call',
            title: 'Hosted video call',
            description: 'Weekly study session',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { participants: 8, duration: 90 }
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and participation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your latest actions and participation in study groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type]
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-full ${activityColors[activity.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      
                      {activity.metadata && (
                        <div className="flex items-center gap-2 mt-2">
                          {activity.metadata.groupName && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.metadata.groupName}
                            </Badge>
                          )}
                          {activity.metadata.participants && (
                            <Badge variant="outline" className="text-xs">
                              {activity.metadata.participants} participants
                            </Badge>
                          )}
                          {activity.metadata.duration && (
                            <Badge variant="outline" className="text-xs">
                              {activity.metadata.duration} min
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>Overview of your participation this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">3</div>
              <p className="text-sm text-muted-foreground">Video Calls</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">7</div>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">5</div>
              <p className="text-sm text-muted-foreground">Notes Created</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">12</div>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}