'use client';

import { AppShell } from '@/components/AppShell';
import { PanoramaHub } from '@/components/PanoramaHub';

export default function PanoramasPage() {
  return (
    <AppShell>
      <div className="pano-hub-page">
        <PanoramaHub />
      </div>
    </AppShell>
  );
}
