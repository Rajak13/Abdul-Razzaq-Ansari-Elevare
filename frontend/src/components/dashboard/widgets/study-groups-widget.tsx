'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, Calendar, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface StudyGroupsWidgetProps {
  className?: string
}

export function StudyGroupsWidget({ className }: StudyGroupsWidgetProps) {
  // TODO: Replace with real study groups API when implemented
  // const { data: studyGroupsResponse, isLoading } = useStudyGroups()
  // const studyGroups = Array.isArray(studyGroupsResponse?.groups) ? studyGroupsResponse.groups : []
  
  // For now, show empty state since study groups feature is not yet implemented
  const studyGroups: any[] = []
  const activeGroups = studyGroups.filter(group => group.isActive)
  const totalMembers = studyGroups.reduce((sum, group) => sum + group.members, 0)

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Study Groups
        </CardTitle>
        <Link href="/study-groups">
          <Button size="sm" variant="outline" className="h-8">
            <Plus className="mr-1 h-3 w-3" />
            Join Group
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{activeGroups.length}</div>
              <div className="text-xs text-muted-foreground">Active Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalMembers}</div>
              <div className="text-xs text-muted-foreground">Total Members</div>
            </div>
          </div>

          {/* Groups List */}
          <div className="space-y-3">
            {studyGroups.length > 0 ? (
              <>
                {studyGroups.slice(0, 3).map((group) => (
                  <div key={group.id} className="flex items-start space-x-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className={`rounded-full p-2 ${group.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        {group.isActive && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center space-x-3 text-xs text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{group.members} members</span>
                        </span>
                        {group.nextSession && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Next: {new Date(group.nextSession).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {group.subject}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                <Link href="/study-groups">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View All Groups
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Study Groups Coming Soon!</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Connect with classmates and form study groups to collaborate on your learning journey.
                </p>
                <Button size="sm" variant="outline" disabled>
                  <Plus className="mr-1 h-3 w-3" />
                  Feature in Development
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}