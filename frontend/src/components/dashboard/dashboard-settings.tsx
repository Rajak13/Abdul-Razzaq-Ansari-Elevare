'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import { useState } from 'react'

interface DashboardSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DashboardSettings({ open, onOpenChange }: DashboardSettingsProps) {
  const { layout, updateLayout } = useDashboardStore()
  const [localLayout, setLocalLayout] = useState(layout)

  const handleSave = () => {
    updateLayout(localLayout)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalLayout(layout)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogDescription>
            Customize your dashboard layout and appearance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="columns" className="text-right">
              Columns
            </Label>
            <Input
              id="columns"
              type="number"
              min="2"
              max="6"
              value={localLayout.columns}
              onChange={(e) =>
                setLocalLayout({
                  ...localLayout,
                  columns: parseInt(e.target.value) || 4,
                })
              }
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gap" className="text-right">
              Gap (px)
            </Label>
            <Input
              id="gap"
              type="number"
              min="8"
              max="32"
              value={localLayout.gap}
              onChange={(e) =>
                setLocalLayout({
                  ...localLayout,
                  gap: parseInt(e.target.value) || 16,
                })
              }
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="padding" className="text-right">
              Padding (px)
            </Label>
            <Input
              id="padding"
              type="number"
              min="16"
              max="48"
              value={localLayout.containerPadding}
              onChange={(e) =>
                setLocalLayout({
                  ...localLayout,
                  containerPadding: parseInt(e.target.value) || 24,
                })
              }
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}