import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'completed']),
  due_date: z.string().optional(),
  tags: z.array(z.string()),
  category_id: z.string().optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>