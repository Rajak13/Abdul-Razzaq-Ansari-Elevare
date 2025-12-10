'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { noteTemplates } from './note-templates';
import { NoteTemplate } from '@/types/note';
import { FileText, BookOpen, Users } from 'lucide-react';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect: (template: NoteTemplate) => void;
}

const templateIcons = {
  basic: FileText,
  study: BookOpen,
  meeting: Users,
};

export function TemplateSelector({
  open,
  onOpenChange,
  onTemplateSelect,
}: TemplateSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {noteTemplates.map((template) => {
            const Icon = templateIcons[template.id as keyof typeof templateIcons] || FileText;
            
            return (
              <Card
                key={template.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
                onClick={() => onTemplateSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{template.preview}</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}