"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Search, LogOut, Layers, LogIn, UserPlus, Wallet, Sparkles } from "lucide-react";

export const Header: React.FC = () => {
  const { isAuthenticated, balance, logout, loading } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const searchVal = searchParams ? (searchParams.get("q") || "") : "";

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }

    if (pathname !== "/") {
      router.push(`/?${params.toString()}`);
    } else {
      router.replace(`/?${params.toString()}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2 font-black tracking-tighter text-lg select-none">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#2468e4] to-[#0966ff] flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-500/20">
            P
          </span>
          <span className="hidden sm:inline bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent font-sans tracking-tight">
            polymarket
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-wider scale-90">
            pro
          </span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search markets (e.g. Trump, Crypto, Mars)..."
            value={searchVal}
            onChange={handleSearchChange}
            icon={<Search className="h-4 w-4 text-neutral-400" />}
            className="bg-surface border-border/80 text-xs h-9 focus-visible:ring-[#2468e4]"
          />
        </div>

        {/* Auth details & navigation links */}
        <div className="flex items-center gap-3">
          {!loading && (
            isAuthenticated ? (
              <>
                <Link
                  href="/portfolio"
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-surface border border-transparent hover:border-border font-medium"
                >
                  <Layers className="h-4 w-4 text-[#2468e4]" />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>
                
                <div className="text-xs bg-surface border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-[#2468e4]" />
                  <span className="hidden sm:inline text-text-secondary">Balance:</span>
                  <span className="font-bold text-white">${balance.toFixed(2)}</span>
                </div>

                <Link href="/portfolio?tab=deposit">
                  <Button variant="purple" size="sm" className="bg-[#2468e4] hover:bg-[#1a56cd] text-xs font-bold py-1.5 px-3">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    <span>Deposit</span>
                  </Button>
                </Link>

                <Button
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold py-1.5 px-3 hover:text-red-400 hover:bg-red-500/5"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs font-bold gap-1 hover:bg-surface">
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Log In</span>
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="purple" size="sm" className="bg-[#2468e4] hover:bg-[#1a56cd] text-xs font-bold gap-1">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
};
