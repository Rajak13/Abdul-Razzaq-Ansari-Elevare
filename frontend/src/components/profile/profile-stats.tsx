'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  BookOpen, 
  Clock, 
  Trophy, 
  Target, 
  Calendar,
  FileText,
  Video
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ProfileStats {
  studyGroups: {
    joined: number
    created: number
  }
  studySessions: {
    total: number
    thisWeek: number
    totalHours: number
  }
  tasks: {
    completed: number
    pending: number
    completionRate: number
  }
  notes: {
    total: number
    shared: number
  }
  videoCalls: {
    attended: number
    hosted: number
    totalMinutes: number
  }
  achievements: {
    badges: number
    streak: number
  }
}

export function ProfileStats() {
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('/api/profile/stats', {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch profile stats:', error)
        // Set mock data for demonstration
        setStats({
          studyGroups: { joined: 5, created: 2 },
          studySessions: { total: 24, thisWeek: 3, totalHours: 48 },
          tasks: { completed: 45, pending: 12, completionRate: 78 },
          notes: { total: 89, shared: 23 },
          videoCalls: { attended: 18, hosted: 6, totalMinutes: 720 },
          achievements: { badges: 8, streak: 12 }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Failed to load statistics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Study Groups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studyGroups.joined}</div>
            <p className="text-xs text-muted-foreground">
              {stats.studyGroups.created} created by you
            </p>
          </CardContent>
        </Card>

        {/* Study Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Sessions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studySessions.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.studySessions.thisWeek} this week
            </p>
          </CardContent>
        </Card>

        {/* Study Hours */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studySessions.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              Total time studied
            </p>
          </CardContent>
        </Card>

        {/* Task Completion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.completionRate}%</div>
            <Progress value={stats.tasks.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.tasks.completed} completed, {stats.tasks.pending} pending
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notes.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.notes.shared} shared with groups
            </p>
          </CardContent>
        </Card>

        {/* Video Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Calls</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.videoCalls.attended}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(stats.videoCalls.totalMinutes / 60)}h total call time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
          <CardDescription>
            Your learning milestones and accomplishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Badges Earned</p>
                <p className="text-sm text-muted-foreground">Learning achievements</p>
              </div>
              <div className="text-2xl font-bold text-primary">{stats.achievements.badges}</div>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Study Streak</p>
                <p className="text-sm text-muted-foreground">Consecutive days</p>
              </div>
              <div className="text-2xl font-bold text-primary">{stats.achievements.streak}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}