import React from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { MarketDetail } from "./pages/MarketDetail";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Portfolio } from "./pages/Portfolio";
import { Input } from "./components/ui/Input";
import { Button } from "./components/ui/Button";
import { Search, LogOut, Layers, LogIn, UserPlus } from "lucide-react";

// Inner layout to get router context hooks (navigate, searchParams)
const AppLayout: React.FC = () => {
  const { isAuthenticated, balance, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchVal = searchParams.get("q") || "";

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }

    if (window.location.pathname !== "/") {
      navigate(`/?${params.toString()}`);
    } else {
      navigate(`/?${params.toString()}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Wordmark */}
          <Link to="/" className="flex items-center gap-2 font-black tracking-tighter text-lg select-none">
            <span className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-purple/20">
              P
            </span>
            <span className="hidden sm:inline bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
              polymarket
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple/10 border border-purple/20 text-purple uppercase tracking-wider scale-90">
              clone
            </span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search markets..."
              value={searchVal}
              onChange={handleSearchChange}
              icon={<Search className="h-4 w-4" />}
              className="bg-surface border-border/80 text-xs h-9 focus-visible:ring-purple"
            />
          </div>

          {/* Auth details & navigation links */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/portfolio"
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-surface border border-transparent hover:border-border font-medium"
                >
                  <Layers className="h-4 w-4 text-purple" />
                  <span className="hidden md:inline">Portfolio</span>
                </Link>
                <div className="text-xs bg-surface border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="text-text-secondary">Balance:</span>
                  <span className="font-bold text-white">${balance.toFixed(2)}</span>
                </div>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold py-1.5 px-3"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden md:inline">Log Out</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-xs font-bold gap-1">
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Log In</span>
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="purple" size="sm" className="text-xs font-bold gap-1">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/market/:id" element={<MarketDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-black/10 py-6 text-center text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} Polymarket Clone. All rights reserved.</p>
          <p className="opacity-80">Built with Vite, React 19, TypeScript, Tailwind CSS, and Prisma.</p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
