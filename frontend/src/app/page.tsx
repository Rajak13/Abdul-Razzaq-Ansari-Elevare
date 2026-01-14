import { redirect } from 'next/navigation';

export default function RootPage() {
  // This page should never be reached due to middleware redirect
  // But as a fallback, redirect to /en
  redirect('/en');
}
