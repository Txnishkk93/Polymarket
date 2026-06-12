import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getMarkets, derivePrices, getCategory } from "../lib/api";
import type { Market } from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TrendingUp, Award } from "lucide-react";

export const Home: React.FC = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchIndex = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("category") || "All";

  useEffect(() => {
    async function fetchMarketsData() {
      try {
        setLoading(true);
        const data = await getMarkets();
        setMarkets(data.markets || []);
      } catch (err) {
        console.error("Error loading markets:", err);
        setError("Could not load markets. Please make sure the backend is running.");
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

  return (
    <div className="space-y-6">
      {/* Category Navigation (Visual & Functional) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 border-b border-border/40 scrollbar-hide">
        {["All", "Trending", "Politics", "Crypto", "Tech", "Science"].map((category) => (
          <button
            key={category}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              if (category === "All") {
                params.delete("category");
              } else {
                params.set("category", category);
              }
              navigate(`/?${params.toString()}`);
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              (category === "All" && !searchParams.get("category")) ||
              searchParams.get("category") === category
                ? "bg-purple text-white shadow-md shadow-purple/10"
                : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-neutral-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Hero promo card */}
      {!searchIndex && selectedCategory === "All" && (
        <div className="relative rounded-2xl bg-gradient-to-r from-purple/40 via-surface to-background border border-purple/20 p-6 sm:p-8 overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple/20 border border-purple/30 text-purple text-xs font-bold">
              <TrendingUp className="h-3 w-3" />
              <span>Predictions Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Trade on World Events with Zero Spread
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Predict outcomes on Politics, Crypto, Tech, and more. Deposit mock USD to get started with no risks.
            </p>
            <div className="pt-2 flex gap-3">
              <Link to="/signup">
                <Button variant="purple" size="sm">
                  Create Account
                </Button>
              </Link>
              <Link to="/portfolio">
                <Button variant="outline" size="sm">
                  View Portfolio
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
            <Award className="w-full h-full text-purple" />
          </div>
        </div>
      )}

      {/* Markets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Active Markets</span>
            <span className="text-xs font-normal text-text-secondary px-2 py-0.5 bg-surface border border-border rounded-full">
              {filteredMarkets.length}
            </span>
          </h2>
        </div>

        {error && (
          <div className="p-6 text-center bg-red-500/5 border border-red-500/10 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse bg-surface border-border">
                <CardContent className="p-5 space-y-4">
                  <div className="h-4 bg-neutral-800 rounded w-1/4"></div>
                  <div className="space-y-2">
                    <div className="h-5 bg-neutral-800 rounded w-full"></div>
                    <div className="h-5 bg-neutral-800 rounded w-5/6"></div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-10 bg-neutral-800 rounded w-[45%]"></div>
                    <div className="h-10 bg-neutral-800 rounded w-[45%]"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center p-12 bg-surface border border-border rounded-xl space-y-2">
            <p className="text-text-secondary text-sm">No markets found matching your criteria.</p>
            <button
              onClick={() => navigate("/")}
              className="text-purple hover:underline text-xs"
            >
              Reset filters
            </button>
          </div>
        ) : (
          /* Grid of Markets */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => {
              const { yesPrice, noPrice } = derivePrices(
                market.yesOrderbook,
                market.noOrderbook
              );
              const category = getCategory(market.title);

              return (
                <Card
                  key={market.id}
                  hoverable
                  className="flex flex-col justify-between"
                >
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-text-secondary bg-surface border border-border px-2 py-0.5 rounded w-fit">
                        {category}
                      </div>
                      <Link
                        to={`/market/${market.id}`}
                        className="block group"
                      >
                        <h3 className="font-bold text-white leading-snug group-hover:text-purple transition-colors duration-200">
                          {market.title}
                        </h3>
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {/* Percentages Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                          <span className="text-yes">Yes: {yesPrice}%</span>
                          <span className="text-no">No: {noPrice}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                          <div
                            className="bg-yes"
                            style={{ width: `${yesPrice}%` }}
                          />
                          <div
                            className="bg-no"
                            style={{ width: `${noPrice}%` }}
                          />
                        </div>
                      </div>

                      {/* Trade buttons */}
                      <div className="flex gap-2">
                        <Link
                          to={`/market/${market.id}?trade=yes`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full border-yes/30 text-yes bg-yes/5 hover:bg-yes/15 hover:border-yes text-xs py-2 h-auto flex flex-col items-center gap-0.5 font-bold"
                          >
                            <span>Buy Yes</span>
                            <span className="text-[10px] font-normal opacity-90">
                              {yesPrice}¢
                            </span>
                          </Button>
                        </Link>
                        <Link
                          to={`/market/${market.id}?trade=no`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full border-no/30 text-no bg-no/5 hover:bg-no/15 hover:border-no text-xs py-2 h-auto flex flex-col items-center gap-0.5 font-bold"
                          >
                            <span>Buy No</span>
                            <span className="text-[10px] font-normal opacity-90">
                              {noPrice}¢
                            </span>
                          </Button>
                        </Link>
                      </div>

                      {/* Stats footer */}
                      <div className="flex items-center justify-between text-[11px] text-text-secondary pt-2 border-t border-border/40">
                        <span>Total shares: {market.totalQty}</span>
                        {market.resolution && (
                          <span className="text-green-400 font-bold">
                            Resolved: {market.resolution}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
