'use client';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Studio } from '@/components/Studio';
export default function DesignStudioPage() {
  const params = useParams<{ projectId: string }>();
  return <AppShell compact><Studio projectId={params.projectId}/></AppShell>;
}
