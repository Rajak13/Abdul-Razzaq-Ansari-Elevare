'use client'

import { NoteTemplate } from '@/types/note';
import { useTranslations } from 'next-intl';

export function useNoteTemplates(): NoteTemplate[] {
  const t = useTranslations('notes.templates');
  
  return [
    {
      id: 'basic',
      name: t('blank'),
      description: 'A simple note with title and content',
      preview: 'Simple text editor for general note-taking',
      content: `# ${t('blank')}

Start writing your thoughts here...

You can format text as **bold**, *italic*, or \`code\`.

## Features
- Bullet points
- **Bold text**
- *Italic text*
- [Links](https://example.com)
- \`Inline code\`

### Code Blocks
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\``,
    },
    {
      id: 'study',
      name: t('lecture'),
      description: t('lectureDescription'),
      preview: t('lectureDescription'),
      content: `# ${t('lecture')} - [Subject/Topic]

**Date:** ${new Date().toLocaleDateString()}

## 🎯 Learning Objectives
- What I need to learn from this session
- Key skills to develop
- Understanding goals

## 📚 Key Concepts

### Concept 1
Definition and explanation...

### Concept 2
Definition and explanation...

## 📝 Notes & Examples

### Important Points
- Point 1
- Point 2
- Point 3

### Examples
1. Example 1 with explanation
2. Example 2 with explanation

## 🔍 Summary & Review

### Key Takeaways
- Main point 1
- Main point 2
- Main point 3

### Questions for Review
- [ ] Question 1
- [ ] Question 2
- [ ] Question 3

### Next Steps
- [ ] Practice exercises
- [ ] Review materials
- [ ] Prepare for next session`,
    },
    {
      id: 'meeting',
      name: t('meeting'),
      description: t('meetingDescription'),
      preview: t('meetingDescription'),
      content: `# ${t('meeting')}

**Date:** ${new Date().toLocaleDateString()}
**Time:** [Meeting Time]
**Attendees:** [List of attendees]

## 📋 Agenda
1. Agenda item 1
2. Agenda item 2
3. Agenda item 3

## 📝 Discussion Points

### Topic 1
- Key points discussed
- Decisions made
- Concerns raised

### Topic 2
- Key points discussed
- Decisions made
- Concerns raised

##  Action Items
- [ ] **[Assignee]** - Action item 1 (Due: [Date])
- [ ] **[Assignee]** - Action item 2 (Due: [Date])
- [ ] **[Assignee]** - Action item 3 (Due: [Date])

## 📌 Next Meeting
**Date:** [Next meeting date]
**Agenda Preview:**
- Follow up on action items
- New topics to discuss`,
    },
    {
      id: 'project',
      name: t('project'),
      description: t('projectDescription'),
      preview: t('projectDescription'),
      content: `# ${t('project')}: [Project Name]

**Start Date:** ${new Date().toLocaleDateString()}
**Status:** Planning
**Priority:** Medium

## 🎯 Project Overview

### Objective
Brief description of what this project aims to achieve.

### Success Criteria
- Criteria 1
- Criteria 2
- Criteria 3

## 📋 Tasks & Milestones

### Phase 1: Planning
- [ ] Define requirements
- [ ] Create timeline
- [ ] Assign resources

### Phase 2: Development
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Phase 3: Testing & Deployment
- [ ] Testing
- [ ] Documentation
- [ ] Deployment

## 📊 Progress Tracking

### Completed 
- [List completed items]

### In Progress 🔄
- [List current work]

### Blocked 
- [List blocked items]

## 📝 Notes & Updates
[Add project updates, decisions, and important notes here]`,
    },
    {
      id: 'research',
      name: t('research'),
      description: t('researchDescription'),
      preview: t('researchDescription'),
      content: `# ${t('research')}: [Topic]

**Date:** ${new Date().toLocaleDateString()}
**Research Question:** [Main question being investigated]

## 🔍 Research Objectives
- Primary objective
- Secondary objectives
- Expected outcomes

## 📚 Sources & References

### Primary Sources
1. [Source 1] - [Brief description]
2. [Source 2] - [Brief description]

### Secondary Sources
1. [Source 1] - [Brief description]
2. [Source 2] - [Brief description]

## 📝 Key Findings

### Finding 1
**Source:** [Reference]
**Summary:** [Key points and insights]
**Relevance:** [How this relates to research question]

### Finding 2
**Source:** [Reference]
**Summary:** [Key points and insights]
**Relevance:** [How this relates to research question]

## 💡 Analysis & Insights
- Pattern 1: [Description]
- Pattern 2: [Description]
- Unexpected findings: [Description]

## 🎯 Conclusions
- Main conclusion 1
- Main conclusion 2
- Areas for further research

## 📋 Next Steps
- [ ] Follow-up research needed
- [ ] Additional sources to explore
- [ ] Questions to investigate further`,
    },
  ];
}

// Helper function to get template by ID from a templates array
export function getTemplateById(templates: NoteTemplate[], id: string): NoteTemplate | undefined {
  return templates.find(t => t.id === id);
}

// Helper function to get the default template (first one, which is 'basic')
export function getDefaultTemplate(templates: NoteTemplate[]): NoteTemplate {
  return templates[0] || {
    id: 'basic',
    name: 'Blank Note',
    description: 'A simple note with title and content',
    preview: 'Simple text editor for general note-taking',
    content: '# Blank Note\n\nStart writing your thoughts here...',
  };
}