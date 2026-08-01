'use client';
import { useParams } from 'next/navigation';
import { PublicDesignPage } from '@/components/PublicDesignPage';
export default function CustomerDesignPage() {
  const params = useParams<{ slug: string }>();
  return <PublicDesignPage slug={params.slug}/>;
}
