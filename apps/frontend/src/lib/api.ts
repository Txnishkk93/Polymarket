import axios from "axios";

const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to attach authorization header
const authHeaders = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export interface Market {
  id: string;
  title: string;
  description: string;
  resolutionDescription: string;
  yesOrderbook: any; // Orderbook record
  noOrderbook: any;  // Orderbook record
  totalQty: number;
  resolution: "Yes" | "No" | null;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  type: "Yes" | "No";
  qty: number;
}

export interface OrderHistoryItem {
  id: string;
  orderType: "Buy" | "Sell" | "Split" | "Merge";
  qty: number;
  price: number;
  userId: string;
  marketId: string;
}

export interface PlaceOrderPayload {
  marketId: string;
  side: "yes" | "no";
  type: "buy" | "sell";
  price: number; // in cents
  qty: number;
}

export interface SplitMergePayload {
  marketId: string;
  amount: number;
}

// API functions
export async function getMarkets() {
  const response = await apiClient.get<{ markets: Market[] }>("/markets");
  return response.data;
}

export async function getMarket(marketId: string) {
  const response = await apiClient.get<{ market: Market }>(`/market`, {
    params: { marketId },
  });
  return response.data;
}

export async function login(email: string, password: string) {
  const response = await apiClient.post<{ token: string }>("/login", {
    email,
    password,
  });
  return response.data;
}

export async function signup(email: string, password: string) {
  const response = await apiClient.post<{ message: string; userId: string }>(
    "/signup",
    { email, password }
  );
  return response.data;
}

export async function placeOrder(payload: PlaceOrderPayload, token: string) {
  const response = await apiClient.post<{ message: string }>(
    "/order",
    payload,
    authHeaders(token)
  );
  return response.data;
}

export async function getBalance(token: string) {
  const response = await apiClient.get<{ balance: number }>(
    "/balance",
    authHeaders(token)
  );
  return response.data;
}

export async function getPositions(token: string) {
  const response = await apiClient.get<{ positions: Position[] }>(
    "/positions",
    authHeaders(token)
  );
  return response.data;
}

export async function getHistory(token: string) {
  const response = await apiClient.get<{ history: OrderHistoryItem[] }>(
    "/history",
    authHeaders(token)
  );
  return response.data;
}

export async function split(payload: SplitMergePayload, token: string) {
  const response = await apiClient.post<{ message: string }>(
    "/split",
    payload,
    authHeaders(token)
  );
  return response.data;
}

export async function merge(payload: SplitMergePayload, token: string) {
  const response = await apiClient.post<{ message: string }>(
    "/merge",
    payload,
    authHeaders(token)
  );
  return response.data;
}

export async function onramp(amount: number, token: string) {
  const response = await apiClient.post<{ message: string; amount: number }>(
    "/onramp",
    { amount },
    authHeaders(token)
  );
  return response.data;
}

export async function offramp(amount: number, token: string) {
  const response = await apiClient.post<{ message: string; amount: number }>(
    "/offramp",
    { amount },
    authHeaders(token)
  );
  return response.data;
}
