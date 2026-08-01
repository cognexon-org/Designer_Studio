export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('ready') || normalized.includes('published') || normalized.includes('succeeded') || normalized.includes('approved') || normalized.includes('confirmed') || normalized.includes('verified')
    ? 'success'
    : normalized.includes('failed') || normalized.includes('required') || normalized.includes('rejected')
      ? 'danger'
      : normalized.includes('generating') || normalized.includes('running') || normalized.includes('queued')
        ? 'warning'
        : 'neutral';
  return <span className={`status-badge status-${tone}`}>{status.replaceAll('_', ' ')}</span>;
}
