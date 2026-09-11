'use client';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ProgressProjectWorkspace } from '@/components/ProgressProjectWorkspace';

export default function ProgressProjectPage() {
  const params = useParams<{ projectId: string }>();
  return <AppShell compact><ProgressProjectWorkspace projectId={params.projectId}/></AppShell>;
}
