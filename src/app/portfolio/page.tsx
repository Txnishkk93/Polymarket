"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getMarkets, getPositions, getHistory, split, merge, onramp, offramp, type Market, type Position, type OrderHistoryItem } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "../../components/ui/Dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { Wallet, ArrowUpRight, ArrowDownLeft, CircleDollarSign, History, Layers } from "lucide-react";

function PortfolioContent() {
  const { token, balance, refreshBalance } = useAuth();
  const searchParams = useSearchParams();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isOnrampOpen, setIsOnrampOpen] = useState(false);
  const [isOfframpOpen, setIsOfframpOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Split/Merge states
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [splitMergeAmount, setSplitMergeAmount] = useState("");
  const [splitMergeLoading, setSplitMergeLoading] = useState(false);
  const [splitMergeMsg, setSplitMergeMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Read search parameter tab
  useEffect(() => {
    if (searchParams && searchParams.get("tab") === "deposit") {
      setIsOnrampOpen(true);
    }
  }, [searchParams]);

  const loadDashboardData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [marketsData, positionsData, historyData] = await Promise.all([
        getMarkets(),
        getPositions(token),
        getHistory(token),
      ]);

      setMarkets(marketsData.markets || []);
      setPositions(positionsData.positions || []);
      setHistory(historyData.history || []);

      // Auto-select first market for split/merge if available
      if (marketsData.markets?.length > 0 && !selectedMarketId) {
        setSelectedMarketId(marketsData.markets[0].id);
      }
    } catch (error) {
      console.error("Failed to load portfolio data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  // Helper to map marketId to market title
  const getMarketTitle = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    return market ? market.title : "Unknown Market";
  };

  // Onramp (Deposit) Action
  const handleOnramp = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(amountInput);
    if (isNaN(dollars) || dollars <= 0) {
      setModalError("Please enter a valid amount.");
      return;
    }

    if (!token) return;
    setModalLoading(true);
    setModalError(null);

    try {
      await onramp(dollars, token);
      await refreshBalance();
      setIsOnrampOpen(false);
      setAmountInput("");
      await loadDashboardData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.response?.data?.message || "Failed to process deposit.");
    } finally {
      setModalLoading(false);
    }
  };

  // Offramp (Withdraw) Action
  const handleOfframp = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(amountInput);
    if (isNaN(dollars) || dollars <= 0) {
      setModalError("Please enter a valid amount.");
      return;
    }

    if (dollars > balance) {
      setModalError("Insufficient balance for withdrawal.");
      return;
    }

    if (!token) return;
    setModalLoading(true);
    setModalError(null);

    try {
      await offramp(dollars, token);
      await refreshBalance();
      setIsOfframpOpen(false);
      setAmountInput("");
      await loadDashboardData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.response?.data?.message || "Failed to process withdrawal.");
    } finally {
      setModalLoading(false);
    }
  };

  // Split Action
  const handleSplit = async () => {
    const amount = parseInt(splitMergeAmount);
    if (isNaN(amount) || amount <= 0) {
      setSplitMergeMsg({ text: "Please enter a valid amount.", type: "error" });
      return;
    }

    if (amount > balance) {
      setSplitMergeMsg({ text: "Insufficient USD balance to split.", type: "error" });
      return;
    }

    if (!token || !selectedMarketId) return;
    setSplitMergeLoading(true);
    setSplitMergeMsg(null);

    try {
      await split({ marketId: selectedMarketId, amount }, token);
      setSplitMergeMsg({
        text: `Successfully split $${amount} into Yes and No positions.`,
        type: "success",
      });
      setSplitMergeAmount("");
      await refreshBalance();
      await loadDashboardData();
    } catch (err: any) {
      console.error(err);
      setSplitMergeMsg({
        text: err.response?.data?.message || "Split operation failed.",
        type: "error",
      });
    } finally {
      setSplitMergeLoading(false);
    }
  };

  // Merge Action
  const handleMerge = async () => {
    const amount = parseInt(splitMergeAmount);
    if (isNaN(amount) || amount <= 0) {
      setSplitMergeMsg({ text: "Please enter a valid amount.", type: "error" });
      return;
    }

    // Check position limits
    const yesPosition = positions.find(
      (p) => p.marketId === selectedMarketId && p.type === "Yes"
    );
    const noPosition = positions.find(
      (p) => p.marketId === selectedMarketId && p.type === "No"
    );

    if (!yesPosition || yesPosition.qty < amount || !noPosition || noPosition.qty < amount) {
      setSplitMergeMsg({
        text: "You do not have enough Yes AND No shares to merge.",
        type: "error",
      });
      return;
    }

    if (!token || !selectedMarketId) return;
    setSplitMergeLoading(true);
    setSplitMergeMsg(null);

    try {
      await merge({ marketId: selectedMarketId, amount }, token);
      setSplitMergeMsg({
        text: `Successfully merged ${amount} Yes + No shares into $${amount} USD.`,
        type: "success",
      });
      setSplitMergeAmount("");
      await refreshBalance();
      await loadDashboardData();
    } catch (err: any) {
      console.error(err);
      setSplitMergeMsg({
        text: err.response?.data?.message || "Merge operation failed.",
        type: "error",
      });
    } finally {
      setSplitMergeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yes"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Dashboard Portfolio</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your prediction wallet, split contracts, and monitor active positions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Balance Card */}
          <Card className="bg-surface border border-border overflow-hidden relative rounded-xl">
            <div className="absolute right-4 top-4 opacity-5 text-white">
              <Wallet className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <CircleDollarSign className="h-4 w-4 text-yes" />
                <span>Account Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-black text-white">
                ${balance.toFixed(2)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="w-full text-xs flex items-center justify-center gap-1 py-2 bg-yes hover:bg-yes-hover text-white font-bold rounded-lg"
                  onClick={() => {
                    setAmountInput("");
                    setModalError(null);
                    setIsOnrampOpen(true);
                  }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Add Funds</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs flex items-center justify-center gap-1 py-2 border-border text-white hover:bg-background font-bold rounded-lg"
                  onClick={() => {
                    setAmountInput("");
                    setModalError(null);
                    setIsOfframpOpen(true);
                  }}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Withdraw</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Split/Merge Card */}
          <Card className="bg-surface border border-border rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-yes" />
                <span>Split & Merge Shares</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-text-secondary leading-relaxed bg-background/50 p-3.5 rounded-xl border border-border/60">
                A **Split** turns $1.00 USD into 1 Yes share and 1 No share. A **Merge** redeems 1 Yes share and 1 No share back into $1.00 USD.
              </div>

              {/* Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Target Market
                </label>
                <select
                  value={selectedMarketId}
                  onChange={(e) => setSelectedMarketId(e.target.value)}
                  className="flex h-10 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yes disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                >
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.title.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Share Amount ($ USD value)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={splitMergeAmount}
                  onChange={(e) => setSplitMergeAmount(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full text-xs font-bold py-2 hover:bg-background border-border"
                  onClick={handleSplit}
                  loading={splitMergeLoading}
                >
                  Split USD
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs font-bold py-2 hover:bg-background border-border"
                  onClick={handleMerge}
                  loading={splitMergeLoading}
                >
                  Merge Shares
                </Button>
              </div>

              {/* Feedback Message */}
              {splitMergeMsg && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    splitMergeMsg.type === "success"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  {splitMergeMsg.text}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tables (8 cols) */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="positions">
            <TabsList className="grid grid-cols-2 max-w-[400px] bg-background border border-border p-0.5 rounded-lg mb-4">
              <TabsTrigger value="positions" className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-md font-bold data-[state=active]:bg-border data-[state=active]:text-white">
                <Layers className="h-3.5 w-3.5 text-yes" />
                <span>Active Positions ({positions.filter(p => p.qty > 0).length})</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-md font-bold data-[state=active]:bg-border data-[state=active]:text-white">
                <History className="h-3.5 w-3.5 text-yes" />
                <span>Trade History ({history.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Positions Content */}
            <TabsContent value="positions">
              <Card className="bg-surface border border-border rounded-xl overflow-hidden">
                <CardContent className="p-0">
                  {positions.filter((p) => p.qty > 0).length === 0 ? (
                    <div className="py-16 text-center text-text-secondary text-sm font-medium">
                      You do not have any active share positions.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-background/20">
                          <TableRow className="border-b border-border/80">
                            <TableHead className="w-[60%] py-3 px-4">Market Title</TableHead>
                            <TableHead className="py-3 px-4">Outcome</TableHead>
                            <TableHead className="text-right py-3 px-4">Shares (Qty)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                          {positions
                            .filter((p) => p.qty > 0)
                            .map((position) => (
                              <TableRow key={position.id} className="hover:bg-background/10">
                                <TableCell className="font-semibold text-white py-3.5 px-4">
                                  <Link
                                    href={`/market/${position.marketId}`}
                                    className="hover:underline hover:text-yes transition-colors"
                                  >
                                    {getMarketTitle(position.marketId)}
                                  </Link>
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                      position.type === "Yes"
                                        ? "bg-yes/15 text-yes border border-yes/20"
                                        : "bg-no/15 text-no border border-no/20"
                                    }`}
                                  >
                                    {position.type}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-white py-3.5 px-4">
                                  {position.qty}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trade History Content */}
            <TabsContent value="history">
              <Card className="bg-surface border border-border rounded-xl overflow-hidden">
                <CardContent className="p-0">
                  {history.length === 0 ? (
                    <div className="py-16 text-center text-text-secondary text-sm font-medium">
                      No past transactions found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-background/20">
                          <TableRow className="border-b border-border/80">
                            <TableHead className="w-[50%] py-3 px-4">Market</TableHead>
                            <TableHead className="py-3 px-4">Action</TableHead>
                            <TableHead className="text-right py-3 px-4">Price</TableHead>
                            <TableHead className="text-right py-3 px-4">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                          {history
                            .slice()
                            .reverse() // show latest first
                            .map((item) => (
                              <TableRow key={item.id} className="hover:bg-background/10">
                                <TableCell className="font-semibold text-white py-3.5 px-4">
                                  <Link
                                    href={`/market/${item.marketId}`}
                                    className="hover:underline hover:text-yes transition-colors"
                                  >
                                    {getMarketTitle(item.marketId)}
                                  </Link>
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                                      item.orderType === "Buy"
                                        ? "bg-green-500/10 text-green-400"
                                        : item.orderType === "Sell"
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-neutral-800 text-text-secondary"
                                    }`}
                                  >
                                    {item.orderType}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-mono text-white py-3.5 px-4">
                                  {item.price > 0 ? `${item.price}¢` : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-white font-bold py-3.5 px-4">
                                  {item.qty}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Onramp Deposit Dialog */}
      <Dialog isOpen={isOnrampOpen} onClose={() => setIsOnrampOpen(false)}>
        <form onSubmit={handleOnramp}>
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription>
              Deposit mock USD into your prediction market wallet.
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="space-y-4">
            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs">
                {modalError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Amount (USD)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="100.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOnrampOpen(false)}
              disabled={modalLoading}
              className="border-border text-white hover:bg-surface"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-yes hover:bg-yes-hover text-white font-bold rounded-lg" loading={modalLoading}>
              Deposit Funds
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Offramp Withdraw Dialog */}
      <Dialog isOpen={isOfframpOpen} onClose={() => setIsOfframpOpen(false)}>
        <form onSubmit={handleOfframp}>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Withdraw funds from your predictions account.
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="space-y-4">
            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs">
                {modalError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Amount (USD)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="50.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOfframpOpen(false)}
              disabled={modalLoading}
              className="border-border text-white hover:bg-surface"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-yes hover:bg-yes-hover text-white font-bold rounded-lg" loading={modalLoading}>
              Withdraw Funds
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

import { ProtectedRoute } from "../../components/ProtectedRoute";

export default function PortfolioPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yes"></div>
        </div>
      }>
        <PortfolioContent />
      </Suspense>
    </ProtectedRoute>
  );
}
