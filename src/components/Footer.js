"use client";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col items-center gap-1 text-xs opacity-80">
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:opacity-100">Features</a>
          <a href="#how" className="hover:opacity-100">How it works</a>
          <a href="#demo" className="hover:opacity-100">Demo</a>
        </div>
        <div>© {year} Solana Loyalty. All rights reserved.</div>
      </div>
    </footer>
  );
}


