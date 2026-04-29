import { Metadata } from 'next';
import SharedNoteClient from '@/app/[locale]/shared/[token]/shared-note-client';

// This page is intentionally outside the (authenticated) group — no login required
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/shared/${token}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: `${data.data?.title || 'Shared Note'} — Elevare`,
        description: data.data?.summary || 'View this shared note on Elevare.',
      };
    }
  } catch {
    // fall through to defaults
  }
  return {
    title: 'Shared Note — Elevare',
    description: 'View this shared note on Elevare.',
  };
}

export default async function SharedNotePage({ params }: Props) {
  const { token } = await params;
  return <SharedNoteClient token={token} />;
}
