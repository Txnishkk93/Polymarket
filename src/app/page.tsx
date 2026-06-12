"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getMarkets, derivePrices, getCategory, type Market } from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TrendingUp, Award, List, Grid, Flame, ChevronRight, Vote, Coins, Cpu, Microscope, Film, Trophy } from "lucide-react";

// Helper to get category icon
function getCategoryIcon(category: string) {
  switch (category) {
    case "Politics": return <Vote className="h-4 w-4" />;
    case "Crypto": return <Coins className="h-4 w-4" />;
    case "Tech": return <Cpu className="h-4 w-4" />;
    case "Science": return <Microscope className="h-4 w-4" />;
    case "Pop Culture": return <Film className="h-4 w-4" />;
    case "Sports": return <Trophy className="h-4 w-4" />;
    default: return <Flame className="h-4 w-4" />;
  }
}

function HomeContent() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list"); // Default to professional list view

  const searchParams = useSearchParams();
  const router = useRouter();
  const searchIndex = searchParams ? (searchParams.get("q") || "") : "";
  const selectedCategory = searchParams ? (searchParams.get("category") || "All") : "All";

  useEffect(() => {
    async function fetchMarketsData() {
      try {
        setLoading(true);
        const data = await getMarkets();
        setMarkets(data.markets || []);
      } catch (err) {
        console.error("Error loading markets:", err);
        setError("Could not load markets. Please check if Next.js dev server is running.");
      } finally {
        setLoading(false);
      }
    }
    fetchMarketsData();
  }, []);

  // Filter markets based on search input and active category tab
  const filteredMarkets = markets.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchIndex.toLowerCase()) ||
      m.description.toLowerCase().includes(searchIndex.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      getCategory(m.title).toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Featured / Hot markets (top 3 by volume)
  const featuredMarkets = [...markets]
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 3);

  const totalVolume = markets.reduce((acc, curr) => acc + curr.totalQty, 0);

  return (
    <div className="space-y-8">
      {/* Live Stats Ticker bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface/40 border border-border/50 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-yes animate-pulse" />
          <span>Markets Volume: <strong className="text-white">${totalVolume.toLocaleString()} USD</strong></span>
        </div>
        <div className="flex gap-4">
          <span>Active Contracts: <strong className="text-white">{markets.length}</strong></span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Resolution rate: <strong className="text-white">100% Verified</strong></span>
        </div>
      </div>

      {/* Hero promo card */}
      {!searchIndex && selectedCategory === "All" && (
        <div className="relative rounded-2xl bg-gradient-to-r from-yes/20 via-surface/60 to-background border border-border/80 p-6 sm:p-8 overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yes/10 border border-yes/20 text-yes text-xs font-bold">
              <TrendingUp className="h-3 w-3" />
              <span>Predictions Platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Trade on World Events.<br/>Get Paid on Truth.
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-lg">
              Predict outcomes on Politics, Crypto, Tech, Sports, and Pop Culture. Buy and Sell contracts directly in cents.
            </p>
            <div className="pt-2 flex gap-3">
              <Link href="/signup">
                <Button className="bg-yes hover:bg-yes-hover text-white text-xs font-bold px-5 py-2">
                  Create Account
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button variant="outline" className="border-border text-text-primary hover:bg-surface text-xs font-bold px-5 py-2">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute right-12 bottom-0 top-0 w-1/4 opacity-10 pointer-events-none hidden md:block">
            <Award className="w-full h-full text-yes" />
          </div>
        </div>
      )}

      {/* Featured Slider Mockup */}
      {!searchIndex && selectedCategory === "All" && featuredMarkets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-yes" />
            <span>Featured Markets</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredMarkets.map((market) => {
              const { yesPrice, noPrice } = derivePrices(market.yesOrderbook, market.noOrderbook);
              return (
                <Link key={market.id} href={`/market/${market.id}`} className="group block">
                  <div className="p-4 rounded-xl bg-surface border border-border/80 hover:border-yes/50 transition-all duration-200 h-full flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-yes uppercase tracking-wider">{getCategory(market.title)}</div>
                      <h4 className="text-sm font-bold text-white leading-snug group-hover:text-yes transition-colors duration-200 line-clamp-2">
                        {market.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <span className="text-text-secondary">Vol: ${market.totalQty.toLocaleString()}</span>
                      <div className="flex gap-1.5 font-bold">
                        <span className="text-yes">{yesPrice}¢</span>
                        <span className="text-text-secondary">/</span>
                        <span className="text-no">{noPrice}¢</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide py-1">
            {["All", "Trending", "Politics", "Crypto", "Tech", "Science", "Sports", "Pop Culture"].map((category) => {
              const isSelected =
                (category === "All" && (!searchParams || !searchParams.get("category"))) ||
                (searchParams && searchParams.get("category") === category);

              return (
                <button
                  key={category}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
                    if (category === "All") {
                      params.delete("category");
                    } else {
                      params.set("category", category);
                    }
                    router.push(`/?${params.toString()}`);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-yes text-white border-yes shadow-md shadow-yes/15"
                      : "bg-surface border-border text-text-secondary hover:text-text-primary hover:border-neutral-700"
                  }`}
                >
                  {category !== "All" && category !== "Trending" && getCategoryIcon(category)}
                  <span>{category}</span>
                </button>
              );
            })}
          </div>

          {/* View Toggles */}
          <div className="flex items-center self-end sm:self-center bg-surface border border-border p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-text-secondary hover:text-white transition-all ${viewMode === "list" ? "bg-border text-white" : ""}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-text-secondary hover:text-white transition-all ${viewMode === "grid" ? "bg-border text-white" : ""}`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-6 text-center bg-red-500/5 border border-red-500/10 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          /* Loading Skeletons */
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "space-y-2"}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse bg-surface border-border">
                <CardContent className="p-5 space-y-4">
                  <div className="h-4 bg-neutral-800 rounded w-1/4"></div>
                  <div className="h-5 bg-neutral-800 rounded w-full"></div>
                  <div className="h-10 bg-neutral-800 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center p-12 bg-surface border border-border rounded-xl space-y-3">
            <p className="text-text-secondary text-sm font-medium">No active markets found matching this category.</p>
            <button
              onClick={() => router.push("/")}
              className="text-yes hover:underline text-xs font-bold"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => {
              const { yesPrice, noPrice } = derivePrices(market.yesOrderbook, market.noOrderbook);
              const category = getCategory(market.title);

              return (
                <Card key={market.id} className="flex flex-col justify-between bg-surface border border-border hover:border-border/80 hover:shadow-xl transition-all duration-200 rounded-xl">
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="text-[9px] font-extrabold tracking-wider uppercase text-text-secondary bg-background border border-border px-2 py-0.5 rounded-md w-fit">
                        {category}
                      </div>
                      <Link href={`/market/${market.id}`} className="block group">
                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-yes transition-colors duration-200 line-clamp-3">
                          {market.title}
                        </h3>
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {/* Percentages bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-yes">Yes {yesPrice}¢</span>
                          <span className="text-no">No {noPrice}¢</span>
                        </div>
                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden flex">
                          <div className="bg-yes" style={{ width: `${yesPrice}%` }} />
                          <div className="bg-no" style={{ width: `${noPrice}%` }} />
                        </div>
                      </div>

                      {/* Trade buttons */}
                      <div className="flex gap-2">
                        <Link href={`/market/${market.id}?trade=yes`} className="flex-1">
                          <Button className="w-full bg-yes/10 hover:bg-yes/20 border border-yes/30 text-yes text-xs py-2 h-auto flex flex-col items-center gap-0.5 font-extrabold transition-all rounded-lg">
                            <span>Buy Yes</span>
                            <span className="text-[10px] font-normal opacity-80">{yesPrice}¢</span>
                          </Button>
                        </Link>
                        <Link href={`/market/${market.id}?trade=no`} className="flex-1">
                          <Button className="w-full bg-no/10 hover:bg-no/20 border border-no/30 text-no text-xs py-2 h-auto flex flex-col items-center gap-0.5 font-extrabold transition-all rounded-lg">
                            <span>Buy No</span>
                            <span className="text-[10px] font-normal opacity-80">{noPrice}¢</span>
                          </Button>
                        </Link>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[10px] text-text-secondary pt-2 border-t border-border/40">
                        <span>Volume: ${market.totalQty.toLocaleString()}</span>
                        {market.resolution && (
                          <span className="text-green-400 font-bold">Resolved: {market.resolution}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* PROFESSIONAL LIST VIEW (REAL POLYMARKET STYLE) */
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-text-secondary uppercase font-semibold bg-background/30">
                    <th className="py-3.5 px-4 w-[40%]">Market</th>
                    <th className="py-3.5 px-4 w-[15%]">Category</th>
                    <th className="py-3.5 px-4 w-[15%]">Volume</th>
                    <th className="py-3.5 px-4 w-[15%] text-center">Yes Price</th>
                    <th className="py-3.5 px-4 w-[15%] text-center">No Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMarkets.map((market) => {
                    const { yesPrice, noPrice } = derivePrices(market.yesOrderbook, market.noOrderbook);
                    const category = getCategory(market.title);

                    return (
                      <tr key={market.id} className="hover:bg-background/20 transition-colors duration-150 group">
                        <td className="py-4 px-4">
                          <Link href={`/market/${market.id}`} className="block">
                            <span className="font-bold text-white text-sm leading-snug group-hover:text-yes transition-colors duration-150 block">
                              {market.title}
                            </span>
                            <span className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                              {market.description}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-background border border-border text-text-secondary uppercase">
                            {category}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-bold text-white">
                            ${market.totalQty.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Link href={`/market/${market.id}?trade=yes`} className="inline-block w-24">
                            <Button className="w-full bg-yes/10 hover:bg-yes/25 border border-yes/30 hover:border-yes text-yes text-xs font-extrabold py-2 px-3 flex justify-between items-center rounded-lg transition-all">
                              <span>Yes</span>
                              <span className="text-[11px] font-bold text-yes/90">{yesPrice}¢</span>
                            </Button>
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Link href={`/market/${market.id}?trade=no`} className="inline-block w-24">
                            <Button className="w-full bg-no/10 hover:bg-no/25 border border-no/30 hover:border-no text-no text-xs font-extrabold py-2 px-3 flex justify-between items-center rounded-lg transition-all">
                              <span>No</span>
                              <span className="text-[11px] font-bold text-no/90">{noPrice}¢</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yes"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
