import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Users, CalendarClock, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold mt-1">{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { user, isHR } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const [emp, pending, approved, mine] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return {
        employees: emp.count ?? 0,
        pending: pending.count ?? 0,
        approved: approved.count ?? 0,
        mine: mine.count ?? 0,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        {isHR ? "Overview of your team." : "Your workspace at a glance."}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Employees" value={stats?.employees ?? "—"} />
        <Stat icon={Clock} label={isHR ? "Pending requests" : "My requests"} value={isHR ? (stats?.pending ?? "—") : (stats?.mine ?? "—")} />
        <Stat icon={CheckCircle2} label="Approved (total)" value={stats?.approved ?? "—"} />
        <Stat icon={CalendarClock} label="Your role" value={isHR ? "HR" : "Employee"} />
      </div>
      {!isHR && (
        <Card className="mt-8 p-6">
          <h2 className="font-semibold">Need time off?</h2>
          <p className="text-sm text-muted-foreground mt-1">Head to the Time off tab to submit a request.</p>
        </Card>
      )}
    </div>
  );
}