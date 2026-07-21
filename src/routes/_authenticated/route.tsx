import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, CalendarDays, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading, signOut, isHR, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) return null;

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employees", label: "Employees", icon: Users },
    { to: "/leave", label: "Time off", icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-60 border-r bg-background flex flex-col">
        <div className="p-5 flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-md bg-primary" />
          Peoplebase
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground px-2 truncate">{user?.email}</div>
          <div className="px-2"><Badge variant={isHR ? "default" : "secondary"}>{isHR ? "HR admin" : "Employee"}</Badge></div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut().then(() => navigate({ to: "/auth" }))}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}