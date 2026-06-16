import { Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/switch";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/users": "Users",
  "/agents": "Agents",
  "/agent-pricing": "Agent Pricing",
  "/bundles": "Bundles",
  "/orders": "Orders",
  "/withdrawals": "Withdrawals",
};

export function AdminLayout() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const pageTitle = breadcrumbMap[location.pathname] ?? "Admin";

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="lg:pl-64 min-h-screen transition-all duration-300">
          {/* Topbar */}
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 lg:px-8 border-b bg-background/95 backdrop-blur-sm">
            <h1 className="text-base font-semibold text-foreground pl-12 lg:pl-0">{pageTitle}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="h-9 w-9"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </header>

          <main className="p-4 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
