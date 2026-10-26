import { createFileRoute } from '@tanstack/react-router';
import { listsOptions } from '@/lib/cloud-packing';
import { PackingApp } from '@/components/packing-app';
export const Route = createFileRoute('/_authenticated/trips')({
  loader: ({ context }) => context.queryClient.ensureQueryData(listsOptions),
  head: () => ({ meta: [
    { title: 'My trips — Pack Smart' }, { name: 'description', content: 'Manage your holiday packing lists and trip weather.' },
    { property: 'og:title', content: 'My trips — Pack Smart' }, { property: 'og:description', content: 'Your personal holiday packing lists.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: PackingApp,
});