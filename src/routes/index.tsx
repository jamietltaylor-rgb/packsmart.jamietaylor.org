import { createFileRoute } from '@tanstack/react-router';
import { AuthPanel } from '@/components/auth-panel';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Pack Smart — Holiday Packing Lists' },
    { name: 'description', content: 'Save your holiday packing lists, photos and daily weather to your Pack Smart account.' },
    { property: 'og:title', content: 'Pack Smart — Holiday Packing Lists' },
    { property: 'og:description', content: 'Your next holiday, all packed.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: AuthPanel,
});