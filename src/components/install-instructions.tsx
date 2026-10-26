import { Share, PlusSquare, Smartphone } from 'lucide-react';
export function InstallInstructions() {
  return <footer className="mx-auto max-w-5xl border-t border-border px-6 py-8">
    <h2 className="flex items-center gap-2 font-display text-xl"><Smartphone className="size-5" /> Pack Smart on your phone</h2>
    <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
      <li>1. Open the published Pack Smart website in Safari on your iPhone.</li>
      <li className="flex flex-wrap items-center gap-1">2. Tap Share <Share className="size-4" />, then Add to Home Screen <PlusSquare className="size-4" />.</li>
      <li>3. Tap Add. The Pack Smart icon will appear on your home screen.</li>
    </ol>
    <p className="mt-3 text-xs text-muted-foreground">An internet connection is needed to sign in, save lists and check weather. On Android, use your browser’s Install app or Add to Home screen option.</p>
  </footer>;
}