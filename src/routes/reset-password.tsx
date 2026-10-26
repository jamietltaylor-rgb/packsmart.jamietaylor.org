import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/reset-password')({ head: () => ({ meta: [
  { title: 'Reset password — Pack Smart' }, { name: 'description', content: 'Choose a new password for Pack Smart.' },
  { property: 'og:title', content: 'Reset password — Pack Smart' }, { property: 'og:description', content: 'Securely reset your account password.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
] }), component: ResetPassword });
function ResetPassword() {
  const [recovery, setRecovery] = useState(false); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  useEffect(() => { setRecovery(window.location.hash.includes('type=recovery')); }, []);
  return <main className="mx-auto max-w-sm px-6 py-12"><h1 className="font-display text-3xl">New password</h1>{recovery ? <form className="mt-6 space-y-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false);
    if (error) setMessage(error.message); else { window.history.replaceState(null, '', '/reset-password'); await navigate({ to: '/trips' }); }
  }}><label className="block">New password<input required type="password" minLength={6} autoComplete="new-password" className="mt-2 h-12 w-full rounded-lg border bg-background px-3" value={password} onChange={e => setPassword(e.target.value)} /></label><Button disabled={busy}>Save password</Button></form> : <p className="mt-4">Open the reset link in your email to set a new password.</p>}{message && <p role="status" className="mt-4">{message}</p>}</main>;
}