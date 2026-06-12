import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/50 bg-black/10 py-6 text-center text-xs text-text-secondary mt-12">
      <div className="max-w-7xl mx-auto px-4 space-y-1">
        <p>© {new Date().getFullYear()} Polymarket Pro. All rights reserved.</p>
        <p className="opacity-80">Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Bun, and Prisma.</p>
      </div>
    </footer>
  );
};
