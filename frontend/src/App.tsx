import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Zap, History, Settings, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import HomePage from "@/pages/HomePage";
import SequenceDetailPage from "@/pages/SequenceDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import TovConfigsPage from "@/pages/TovConfigsPage";

function NavItem({
  to,
  icon: Icon,
  children,
  end,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <Button
          variant={isActive ? "default" : "ghost"}
          size="sm"
          className={cn("gap-2", !isActive && "text-muted-foreground")}
          asChild
        >
          <span>
            <Icon className="h-4 w-4" />
            {children}
          </span>
        </Button>
      )}
    </NavLink>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-card">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <NavLink to="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Zap className="h-6 w-6 text-primary" />
              SeqGen
            </NavLink>

            <nav className="flex items-center gap-1">
              <NavItem to="/" icon={Zap} end>
                Generate
              </NavItem>
              <NavItem to="/history" icon={History}>
                History
              </NavItem>
              <NavItem to="/tov-configs" icon={Settings}>
                TOV Configs
              </NavItem>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sequences/:id" element={<SequenceDetailPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/tov-configs" element={<TovConfigsPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <Separator className="mt-16" />
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            Built with <Heart className="h-3 w-3 text-red-500" /> for Valley
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
