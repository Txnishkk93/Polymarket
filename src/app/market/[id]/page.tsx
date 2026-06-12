"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMarket, placeOrder, derivePrices, type Market } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/Tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, ArrowUpDown, Info, AlertCircle, TrendingUp, Sparkles, HelpCircle } from "lucide-react";

function MarketDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const { isAuthenticated, token, balance, refreshBalance } = useAuth();

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trade form state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [priceInput, setPriceInput] = useState<number>(50); // in cents
  const [qtyInput, setQtyInput] = useState<string>(""); // shares
  const [submitting, setSubmitting] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Pre-populate outcome based on query parameter
  useEffect(() => {
    if (searchParams) {
      const tradeParam = searchParams.get("trade");
      if (tradeParam === "yes" || tradeParam === "no") {
        setOutcome(tradeParam);
      }
    }
  }, [searchParams]);

  const fetchMarket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getMarket(id);
      setMarket(data.market);

      // Derive initial price for trade form
      const { yesPrice, noPrice } = derivePrices(
        data.market.yesOrderbook,
        data.market.noOrderbook
      );
      setPriceInput(outcome === "yes" ? yesPrice : noPrice);
    } catch (err: any) {
      console.error("Error loading market details:", err);
      setError("Market not found or API error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
  }, [id, outcome]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yes"></div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-text-secondary text-sm">{error || "Could not retrieve market data."}</p>
        <Link href="/">
          <Button variant="outline">Back to Markets</Button>
        </Link>
      </div>
    );
  }

  const { yesPrice, noPrice } = derivePrices(
    market.yesOrderbook,
    market.noOrderbook
  );

  // Calculate pricing values
  const qtyNum = parseInt(qtyInput) || 0;
  const totalCostCents = qtyNum * priceInput;
  const totalCostDollars = totalCostCents / 100;
  const estimatedPayout = qtyNum; // Each correct share pays out $1.00
  const estimatedProfit = estimatedPayout - totalCostDollars;
  const roiPercent = totalCostDollars > 0 ? (estimatedProfit / totalCostDollars) * 100 : 0;

  // Generate chart data based on yesPrice
  const generateChartData = (currentYes: number) => {
    const startValue = 50;
    const dataPoints = 12;
    const history = [];
    const step = (currentYes - startValue) / (dataPoints - 1);

    for (let i = 0; i < dataPoints; i++) {
      const noise = Math.sin(i * 1.5) * 4 + (i % 2 === 0 ? 2 : -2);
      let val = Math.round(startValue + step * i + noise);
      if (i === dataPoints - 1) {
        val = currentYes;
      }
      val = Math.max(1, Math.min(99, val));

      const date = new Date();
      date.setDate(date.getDate() - (dataPoints - 1 - i));
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      history.push({
        date: formattedDate,
        price: val,
      });
    }
    return history;
  };

  const chartData = generateChartData(yesPrice);

  // Handle Quick Size Buttons
  const handleQuickSize = (amount: number) => {
    const calculatedQty = Math.floor((amount * 100) / priceInput);
    setQtyInput(calculatedQty.toString());
  };

  // Submit Order
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !token) {
      setTradeMessage({ text: "Please log in to trade.", type: "error" });
      return;
    }

    if (qtyNum <= 0) {
      setTradeMessage({ text: "Enter a valid quantity.", type: "error" });
      return;
    }

    setSubmitting(true);
    setTradeMessage(null);

    try {
      await placeOrder(
        {
          marketId: market.id,
          side: outcome,
          type: tradeType,
          price: priceInput,
          qty: qtyNum,
        },
        token
      );

      setTradeMessage({
        text: `Order submitted successfully!`,
        type: "success",
      });
      setQtyInput("");
      await fetchMarket();
      await refreshBalance();
    } catch (err: any) {
      console.error(err);
      setTradeMessage({
        text: err.response?.data?.message || "Failed to submit order. Check your balance.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Extract orderbook asks for rendering
  const getOrderbookList = (book: any) => {
    if (!book || typeof book !== "object") return [];
    return Object.keys(book)
      .map((price) => ({
        price: parseInt(price),
        qty: book[price]?.availableQty || 0,
      }))
      .filter((level) => level.qty > 0)
      .sort((a, b) => a.price - b.price); // Cheapest first
  };

  const yesAsks = getOrderbookList(market.yesOrderbook);
  const noAsks = getOrderbookList(market.noOrderbook);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-text-secondary hover:text-white transition-colors gap-1.5 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Markets</span>
      </Link>

      {/* Title block */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
          {market.title}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-4xl">
          {market.description}
        </p>
      </div>

      {/* Main Grid: Left Chart + Orderbook, Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Card */}
          <Card className="bg-surface border border-border">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Yes Price History (implied probability)
                </CardTitle>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-yes">
                    {yesPrice}¢
                  </span>
                  <span className="text-xs text-text-secondary">
                    chance of Yes
                  </span>
                </div>
              </div>
              <div className="text-xs text-yes bg-yes/10 border border-yes/20 px-3 py-1 rounded-md font-bold flex items-center gap-1.5 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-yes"></span>
                <span>Live Market</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-6 pr-4">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2468e4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2468e4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#4b5563"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#4b5563"
                      fontSize={11}
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}¢`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#ffffff" }}
                      labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                      formatter={(value) => [`${value}¢`, "Yes Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#2468e4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Details & Resolution */}
          <Card className="bg-surface border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-yes" />
                <span>Market Resolution Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary leading-relaxed bg-background/50 p-4 rounded-xl border border-border/60">
                {market.resolutionDescription}
              </p>
            </CardContent>
          </Card>

          {/* Order Book Section */}
          <Card className="bg-surface border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-yes" />
                <span>Order Book Spread</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* YES Columns */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-yes uppercase tracking-wider pb-1 border-b border-yes/20">
                  <span>Yes Asks (Sell Yes)</span>
                  <span>Quantity</span>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                  {yesAsks.length === 0 ? (
                    <div className="text-xs text-text-secondary py-4 text-center bg-background/30 rounded-xl border border-border/40">
                      No active Yes offers. Orderbook empty.
                    </div>
                  ) : (
                    yesAsks.map((ask, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-yes/5 border border-yes/10 hover:border-yes/30 transition-all"
                      >
                        <span className="font-bold text-yes">{ask.price}¢</span>
                        <span className="text-text-secondary">{ask.qty} shares</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* NO Columns */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-no uppercase tracking-wider pb-1 border-b border-no/20">
                  <span>No Asks (Sell No)</span>
                  <span>Quantity</span>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                  {noAsks.length === 0 ? (
                    <div className="text-xs text-text-secondary py-4 text-center bg-background/30 rounded-xl border border-border/40">
                      No active No offers. Orderbook empty.
                    </div>
                  ) : (
                    noAsks.map((ask, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-no/5 border border-no/10 hover:border-no/30 transition-all"
                      >
                        <span className="font-bold text-no">{ask.price}¢</span>
                        <span className="text-text-secondary">{ask.qty} shares</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sticky Sidebar (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <Card className="border border-border bg-surface shadow-xl rounded-xl">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Trading Panel</span>
                {isAuthenticated && (
                  <span className="text-xs font-normal text-text-secondary bg-background border border-border px-2 py-0.5 rounded-full">
                    Bal: ${balance.toFixed(2)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {isAuthenticated ? (
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  {/* Buy / Sell Tabs */}
                  <Tabs value={tradeType} onValueChange={(v: any) => setTradeType(v)}>
                    <TabsList className="bg-background border border-border grid grid-cols-2 rounded-lg p-0.5">
                      <TabsTrigger value="buy" className="text-xs py-1.5 rounded-md font-bold transition-all data-[state=active]:bg-border data-[state=active]:text-white">
                        Buy
                      </TabsTrigger>
                      <TabsTrigger value="sell" className="text-xs py-1.5 rounded-md font-bold transition-all data-[state=active]:bg-border data-[state=active]:text-white">
                        Sell
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Outcome Selectors (Yes/No toggle) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOutcome("yes");
                        setPriceInput(yesPrice);
                      }}
                      className={`py-3 rounded-xl text-sm font-bold border flex flex-col items-center gap-0.5 transition-all duration-200 ${
                        outcome === "yes"
                          ? "bg-yes border-yes text-white shadow-lg shadow-yes/20"
                          : "bg-background border-border text-text-secondary hover:text-white"
                      }`}
                    >
                      <span>YES</span>
                      <span className="text-[11px] font-normal opacity-90">
                        {yesPrice}¢
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOutcome("no");
                        setPriceInput(noPrice);
                      }}
                      className={`py-3 rounded-xl text-sm font-bold border flex flex-col items-center gap-0.5 transition-all duration-200 ${
                        outcome === "no"
                          ? "bg-no border-no text-white shadow-lg shadow-no/20"
                          : "bg-background border-border text-text-secondary hover:text-white"
                      }`}
                    >
                      <span>NO</span>
                      <span className="text-[11px] font-normal opacity-90">
                        {noPrice}¢
                      </span>
                    </button>
                  </div>

                  {/* Limit Price Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary flex justify-between">
                      <span>Limit Price</span>
                      <span>cents per share</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={priceInput}
                      onChange={(e) => setPriceInput(parseInt(e.target.value) || 0)}
                      required
                      className="bg-background border-border focus:border-yes"
                    />
                  </div>

                  {/* Quantity Input (shares) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary flex justify-between">
                      <span>Quantity</span>
                      <span>shares</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="1"
                      value={qtyInput}
                      onChange={(e) => setQtyInput(e.target.value)}
                      required
                      className="bg-background border-border focus:border-yes"
                    />
                  </div>

                  {/* One-tap Buy Size Buttons (Only shown for Buy orders) */}
                  {tradeType === "buy" && (
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => handleQuickSize(amount)}
                          className="bg-background border border-border hover:bg-border py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white transition-all"
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cost & Payout Calculations */}
                  <div className="bg-background/80 border border-border/80 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Average Price</span>
                      <span className="text-white font-medium">
                        {(priceInput / 100).toFixed(2)} USD ({priceInput}¢)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        {tradeType === "buy" ? "Total Cost" : "Shares Sold"}
                      </span>
                      <span className="text-white font-medium">
                        {tradeType === "buy"
                          ? `$${totalCostDollars.toFixed(2)}`
                          : `${qtyNum} shares`}
                      </span>
                    </div>
                    {tradeType === "buy" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Est. Payout</span>
                          <span className="text-green-400 font-bold">
                            ${estimatedPayout.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border/50 pt-2 mt-1">
                          <span className="text-text-secondary font-medium">
                            Est. Profit
                          </span>
                          <span className="text-green-400 font-bold">
                            ${estimatedProfit.toFixed(2)} ({roiPercent.toFixed(1)}% ROI)
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Submit Order Button */}
                  <Button
                    type="submit"
                    className={`w-full text-xs py-3 font-extrabold shadow-lg rounded-xl text-white ${outcome === "yes" ? "bg-yes hover:bg-yes-hover" : "bg-no hover:bg-no-hover"}`}
                    loading={submitting}
                  >
                    Submit {tradeType === "buy" ? "Buy" : "Sell"} Order
                  </Button>

                  {/* Feedback Message */}
                  {tradeMessage && (
                    <div
                      className={`p-3 rounded-lg text-xs border ${
                        tradeMessage.type === "success"
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {tradeMessage.text}
                    </div>
                  )}
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="h-10 w-10 rounded-full bg-yes/10 flex items-center justify-center mx-auto text-yes">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Authentication Required
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-[220px] mx-auto">
                    Sign in to your account to place trades on this market.
                  </p>
                  <Link href="/login" className="block">
                    <Button className="w-full text-xs py-2 bg-yes hover:bg-yes-hover text-white font-bold rounded-lg">
                      Log In to Trade
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yes"></div>
      </div>
    }>
      <MarketDetailContent />
    </Suspense>
  );
}
