'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useStudyGroups } from '@/hooks/use-study-groups'
import { Users, Plus, Calendar, MessageCircle, Lock, Globe } from 'lucide-react'
import Link from 'next/link'

interface StudyGroupsWidgetProps {
  className?: string
}

export function StudyGroupsWidget({ className }: StudyGroupsWidgetProps) {
  const { data: studyGroupsResponse, isLoading, error } = useStudyGroups({ member_of: true, limit: 5 })
  const { data: allGroupsResponse } = useStudyGroups({ limit: 1 }) // Just to get total count
  const studyGroups = studyGroupsResponse?.groups || []
  const totalGroups = allGroupsResponse?.total || 0

  const getGroupInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className={`${className} h-full`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Study Groups
          </CardTitle>
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 rounded-lg p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Study Groups
        </CardTitle>
        <Link href="/groups">
          <Button size="sm" variant="outline" className="h-8">
            <Plus className="mr-1 h-3 w-3" />
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{studyGroups.length}</div>
              <div className="text-xs text-muted-foreground">My Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalGroups}</div>
              <div className="text-xs text-muted-foreground">Total Available</div>
            </div>
          </div>

          {/* Groups List */}
          <div className="space-y-3">
            {studyGroups.length > 0 ? (
              <>
                {studyGroups.slice(0, 3).map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <div className="flex items-start space-x-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getGroupInitials(group.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          {group.is_private ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-3 text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                          </span>
                        </div>
                        {group.user_role && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {group.user_role === 'owner' ? 'Owner' : 
                             group.user_role === 'admin' ? 'Admin' : 'Member'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                
                <Link href="/groups">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View All Groups
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No Study Groups Yet</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Join or create study groups to collaborate with your peers.
                </p>
                <Link href="/groups">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-3 w-3" />
                    Explore Groups
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}