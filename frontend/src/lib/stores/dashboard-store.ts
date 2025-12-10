import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WidgetConfig {
  id: string
  type: 'tasks-overview' | 'recent-notes' | 'calendar' | 'activity' | 'stats' | 'productivity-chart' | 'study-groups' | 'progress-stats'
  title: string
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  visible: boolean
  settings?: Record<string, unknown>
}

export interface LayoutConfig {
  columns: number
  gap: number
  containerPadding: number
}

interface DashboardState {
  widgets: WidgetConfig[]
  layout: LayoutConfig
  isEditing: boolean
}

interface DashboardActions {
  updateWidgets: (widgets: WidgetConfig[]) => void
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void
  addWidget: (widget: Omit<WidgetConfig, 'id'>) => void
  removeWidget: (id: string) => void
  toggleWidget: (id: string) => void
  updateLayout: (layout: Partial<LayoutConfig>) => void
  resetLayout: () => void
  setEditing: (editing: boolean) => void
  reorderWidgets: (activeId: string, overId: string) => void
  duplicateWidget: (id: string) => void
  getWidgetById: (id: string) => WidgetConfig | undefined
  getVisibleWidgets: () => WidgetConfig[]
}

type DashboardStore = DashboardState & DashboardActions

const defaultWidgets: WidgetConfig[] = [
  {
    id: 'tasks-overview',
    type: 'tasks-overview',
    title: 'Tasks Overview',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    visible: true,
  },
  {
    id: 'recent-notes',
    type: 'recent-notes',
    title: 'Recent Notes',
    position: { x: 2, y: 0 },
    size: { width: 2, height: 2 },
    visible: true,
  },
  {
    id: 'calendar',
    type: 'calendar',
    title: 'Calendar',
    position: { x: 0, y: 2 },
    size: { width: 2, height: 2 },
    visible: true,
  },
  {
    id: 'activity',
    type: 'activity',
    title: 'Recent Activity',
    position: { x: 2, y: 2 },
    size: { width: 2, height: 2 },
    visible: true,
  },
]

const defaultLayout: LayoutConfig = {
  columns: 4,
  gap: 16,
  containerPadding: 24,
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // State
      widgets: defaultWidgets,
      layout: defaultLayout,
      isEditing: false,

      // Actions
      updateWidgets: (widgets: WidgetConfig[]) => {
        set({ widgets })
      },

      updateWidget: (id: string, updates: Partial<WidgetConfig>) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, ...updates } : widget
          ),
        }))
      },

      addWidget: (widget: Omit<WidgetConfig, 'id'>) => {
        const id = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        set((state) => ({
          widgets: [...state.widgets, { ...widget, id }],
        }))
      },

      removeWidget: (id: string) => {
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== id),
        }))
      },

      toggleWidget: (id: string) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, visible: !widget.visible } : widget
          ),
        }))
      },

      updateLayout: (layout: Partial<LayoutConfig>) => {
        set((state) => ({
          layout: { ...state.layout, ...layout },
        }))
      },

      resetLayout: () => {
        set({
          widgets: defaultWidgets,
          layout: defaultLayout,
        })
      },

      setEditing: (editing: boolean) => {
        set({ isEditing: editing })
      },

      reorderWidgets: (activeId: string, overId: string) => {
        const { widgets } = get()
        const activeIndex = widgets.findIndex((w) => w.id === activeId)
        const overIndex = widgets.findIndex((w) => w.id === overId)

        if (activeIndex === -1 || overIndex === -1) return

        const newWidgets = [...widgets]
        const [removed] = newWidgets.splice(activeIndex, 1)
        newWidgets.splice(overIndex, 0, removed)

        set({ widgets: newWidgets })
      },

      duplicateWidget: (id: string) => {
        const { widgets } = get()
        const widget = widgets.find((w) => w.id === id)
        if (!widget) return

        const newId = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        const duplicatedWidget: WidgetConfig = {
          ...widget,
          id: newId,
          title: `${widget.title} (Copy)`,
          position: { x: widget.position.x + 1, y: widget.position.y + 1 },
        }

        set((state) => ({
          widgets: [...state.widgets, duplicatedWidget],
        }))
      },

      getWidgetById: (id: string) => {
        const { widgets } = get()
        return widgets.find((w) => w.id === id)
      },

      getVisibleWidgets: () => {
        const { widgets } = get()
        return widgets.filter((w) => w.visible)
      },
    }),
    {
      name: 'dashboard-store',
      partialize: (state) => ({
        widgets: state.widgets,
        layout: state.layout,
      }),
    }
  )
)