import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Users, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" />;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-7 w-7 rounded-md bg-primary" />
            Peoplebase
          </div>
          <Button asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-semibold tracking-tight">HR, without the busywork.</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            A calm, shared workspace for your team directory and time off. Employees request, HR approves, everyone stays in sync.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
        <div className="mt-20 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-6">
            <Users className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">Employee directory</h3>
            <p className="mt-1 text-sm text-muted-foreground">Names, roles, departments, and contact info — always up to date.</p>
          </div>
          <div className="rounded-lg border p-6">
            <CalendarCheck className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">Time off tracking</h3>
            <p className="mt-1 text-sm text-muted-foreground">Employees request PTO. HR approves in a click. Balances update automatically.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
