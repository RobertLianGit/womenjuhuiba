import Link from 'next/link';
import { PartyPopper } from 'lucide-react';

export function Navbar({ activePage }: { activePage?: string }) {
  return (
    <header className="bg-card border-b-2 border-outline sticky top-0 z-40">
      <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <PartyPopper className="text-primary w-6 h-6" />
          <span className="font-bold text-xl tracking-tight text-foreground">我们聚会吧<span className="text-xs font-normal align-super ml-0.5 text-secondary">Beta</span></span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 text-sm font-semibold border-2 rounded-md transition-colors ${
              activePage === 'home'
                ? 'border-outline bg-primary text-primary-foreground'
                : 'border-transparent hover:border-outline'
            }`}
          >
            首页
          </Link>
        </nav>
      </div>
    </header>
  );
}
