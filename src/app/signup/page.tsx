"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Mail, Lock } from "lucide-react";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signup(email, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to sign up. Email might be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-surface border border-border">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Join Polymarket Pro and start trading
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">
                Account created successfully! Redirecting to login...
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4 text-neutral-400" />}
                required
                disabled={success}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4 text-neutral-400" />}
                required
                disabled={success}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="h-4 w-4 text-neutral-400" />}
                required
                disabled={success}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-yes hover:bg-yes-hover text-white font-bold"
              loading={loading}
              disabled={success}
            >
              Sign Up
            </Button>
            <div className="text-xs text-center text-text-secondary w-full space-y-2">
              <div>
                Already have an account?{" "}
                <Link href="/login" className="text-yes hover:underline font-semibold">
                  Log In
                </Link>
              </div>
              <div>
                <Link href="/" className="text-text-secondary hover:text-white underline">
                  Continue browsing without login
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
