'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useCreateStudyGroup, useUpdateStudyGroup } from '@/hooks/use-study-groups';
import { CreateStudyGroupInput, StudyGroupWithMemberCount } from '@/types/study-group';
import { Loader2 } from 'lucide-react';

const studyGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255, 'Group name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  is_private: z.boolean().default(false),
  max_members: z.number().min(2, 'Minimum 2 members').max(1000, 'Maximum 1000 members').optional(),
});

type StudyGroupFormData = z.infer<typeof studyGroupSchema>;

interface StudyGroupFormProps {
  group?: StudyGroupWithMemberCount;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StudyGroupForm({ group, onSuccess, onCancel }: StudyGroupFormProps) {
  const isEditing = !!group;
  const createMutation = useCreateStudyGroup();
  const updateMutation = useUpdateStudyGroup();

  const form = useForm({
    resolver: zodResolver(studyGroupSchema),
    defaultValues: {
      name: group?.name || '',
      description: group?.description || '',
      is_private: group?.is_private ?? false,
      max_members: group?.max_members || undefined,
    },
  });

  const onSubmit = async (data: StudyGroupFormData) => {
    try {
      const submitData: CreateStudyGroupInput = {
        name: data.name,
        description: data.description || undefined,
        is_private: data.is_private,
        max_members: data.max_members || undefined,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: group.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Form submission error:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          placeholder="Enter group name..."
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this study group is about..."
          className="min-h-[100px]"
          {...form.register('description')}
        />
        <p className="text-sm text-muted-foreground">
          Help others understand the purpose and focus of your study group
        </p>
        {form.formState.errors.description && (
          <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Private Group</Label>
          <p className="text-sm text-muted-foreground">
            Private groups require approval to join. Public groups can be joined freely.
          </p>
        </div>
        <Switch
          checked={form.watch('is_private')}
          onCheckedChange={(checked) => form.setValue('is_private', checked)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_members">Maximum Members (Optional)</Label>
        <Input
          id="max_members"
          type="number"
          placeholder="No limit"
          min={2}
          max={1000}
          {...form.register('max_members', { valueAsNumber: true })}
        />
        <p className="text-sm text-muted-foreground">
          Set a limit on how many members can join this group
        </p>
        {form.formState.errors.max_members && (
          <p className="text-sm text-red-600">{form.formState.errors.max_members.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Group' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
}