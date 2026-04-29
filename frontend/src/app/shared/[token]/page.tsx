import { Metadata } from 'next';
import SharedNoteClient from './shared-note-client';

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Fetch note title server-side for SEO
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/shared/${params.token}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: `${data.data?.title || 'Shared Note'} — StudySync`,
        description: data.data?.summary || 'View this shared note on StudySync.',
      };
    }
  } catch {
    // fall through to defaults
  }
  return {
    title: 'Shared Note — StudySync',
    description: 'View this shared note on StudySync.',
  };
}

export default function SharedNotePage({ params }: Props) {
  return <SharedNoteClient token={params.token} />;
}
