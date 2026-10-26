import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { InstallInstructions } from './install-instructions';
import { Luggage } from 'lucide-react';

export function AuthPanel() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      if (data.user) void navigate({ to: '/trips' });
    });
  }, [navigate]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('If an account exists, a reset link is on its way to your email.');
      } else {
        const result = mode === 'signup'
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
          : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (result.data.session) await navigate({ to: '/trips' });
        else setMessage('Check your email to confirm your account.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not sign in. Please try again.'); }
    finally { setBusy(false); }
  };
  const social = async (provider: 'google' | 'lovable') => {
    setBusy(true); setMessage('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: '/trips' });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  };
  return <div className="min-h-dvh">
    <header className="bg-sunset text-primary-foreground"><div className="mx-auto max-w-5xl px-6 py-8"><h1 className="flex items-center gap-3 font-display text-4xl font-extrabold"><Luggage className="size-9" />Pack Smart</h1><p className="mt-2">Your next holiday, all packed.</p></div></header>
    <main className="mx-auto max-w-sm px-6 py-10">
      <h2 className="font-display text-2xl">{signedIn ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2>
      {signedIn ? <Button className="mt-6 w-full" onClick={() => navigate({ to: '/trips' })}>Open my lists</Button> : <>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 h-12 w-full rounded-lg border bg-background px-3 text-base" /></label>
          {mode !== 'forgot' && <label className="block text-sm">Password<input required type="password" minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 h-12 w-full rounded-lg border bg-background px-3 text-base" /></label>}
          <Button disabled={busy} className="h-12 w-full" type="submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</Button>
        </form>
        <div className="mt-4 grid gap-2"><Button variant="outline" disabled={busy} onClick={() => social('google')}>Continue with Google</Button><Button variant="outline" disabled={busy} onClick={() => social('lovable')}>Sign in with Lovable</Button></div>
        <div className="mt-4 flex flex-wrap justify-center gap-1"><Button variant="link" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Create an account'}</Button><Button variant="link" onClick={() => { setMode(mode === 'forgot' ? 'login' : 'forgot'); setMessage(''); }}>{mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}</Button></div>
      </>}
      {message && <p role="status" className="mt-4 text-sm text-foreground">{message}</p>}
    </main><InstallInstructions />
  </div>;
}