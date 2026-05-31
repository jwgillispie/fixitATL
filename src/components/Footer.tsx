import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="hairline py-10 mt-auto">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="" width={28} height={28} />
          <span className="wordmark text-base">Fix–ATL</span>
          <span className="text-sm ink-3 ml-3">Est. 2026 · Atlanta, GA</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/feed" className="ink-2 hover:text-black">Feed</Link>
          <Link href="/map" className="ink-2 hover:text-black">Map</Link>
          <Link href="/submit" className="ink-2 hover:text-black">Report</Link>
          <a
            href="https://instagram.com/fix_atl"
            target="_blank"
            rel="noopener noreferrer"
            className="ink-2 hover:text-black"
          >
            Instagram ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
