import { createFileRoute } from '@tanstack/react-router';
import { AuthPanel } from '@/components/auth-panel';
export const Route = createFileRoute('/auth')({ head: () => ({ meta: [
  { title: 'Sign in — Pack Smart' }, { name: 'description', content: 'Sign in or create your Pack Smart account.' },
  { property: 'og:title', content: 'Sign in — Pack Smart' }, { property: 'og:description', content: 'Access your saved holiday lists.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
] }), component: AuthPanel });