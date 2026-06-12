"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, signup as apiSignup, getBalance } from "../lib/api";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  balance: number; // in dollars
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): User | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    let jsonPayload: string;
    if (typeof window !== "undefined") {
      jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } else {
      jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    }
    const decoded = JSON.parse(jsonPayload);
    if (decoded && decoded.id && decoded.email) {
      return { id: decoded.id, email: decoded.email };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("jwt_token");
    if (storedToken) {
      const decodedUser = parseJwt(storedToken);
      if (decodedUser) {
        setToken(storedToken);
        setUser(decodedUser);
      } else {
        localStorage.removeItem("jwt_token");
      }
    }
    setLoading(false);
  }, []);

  // Fetch balance when token changes
  useEffect(() => {
    if (token) {
      refreshBalance();
    } else {
      setBalance(0);
    }
  }, [token]);

  const refreshBalance = async () => {
    if (!token) return;
    try {
      const data = await getBalance(token);
      // Backend stores balance in cents, convert to dollars for display
      setBalance((data.balance ?? 0) / 100);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const login = async (email: string, password: string) => {
    const { token: receivedToken } = await apiLogin(email, password);
    const decodedUser = parseJwt(receivedToken);
    if (!decodedUser) {
      throw new Error("Invalid session token payload received");
    }
    localStorage.setItem("jwt_token", receivedToken);
    setToken(receivedToken);
    setUser(decodedUser);
  };

  const signup = async (email: string, password: string) => {
    await apiSignup(email, password);
  };

  const logout = () => {
    localStorage.removeItem("jwt_token");
    setToken(null);
    setUser(null);
    setBalance(0);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        balance,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
        refreshBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
