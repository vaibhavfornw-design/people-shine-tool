import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import { Users, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
} from "recharts";

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

const TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick",
  personal: "Personal",
  other: "Other",
};
const TYPE_ORDER = ["vacation", "sick", "personal", "other"];
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const STATUS_META: Record<string, { label: string; color: string }> = {
  approved: { label: "Approved", color: "var(--chart-2)" },
  pending: { label: "Pending", color: "var(--chart-4)" },
  rejected: { label: "Rejected", color: "var(--destructive)" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type LeaveRow = {
  leave_type: string;
  status: string;
  days: number | string;
  start_date: string;
};

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

  // RLS scopes this automatically: employees see their own rows, HR sees the whole team.
  const { data: leaves = [] } = useQuery({
    queryKey: ["dashboard-leaves", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("leave_type, status, days, start_date");
      if (error) throw error;
      return (data ?? []) as LeaveRow[];
    },
    enabled: !!user,
  });

  const num = (v: number | string) => (typeof v === "number" ? v : Number(v) || 0);

  // Days by leave type
  const byType = TYPE_ORDER.map((type, i) => ({
    type,
    label: TYPE_LABELS[type],
    days: leaves.filter((l) => l.leave_type === type).reduce((s, l) => s + num(l.days), 0),
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.days > 0);

  // Requests by status
  const byStatus = Object.keys(STATUS_META)
    .map((status) => ({
      status,
      label: STATUS_META[status].label,
      count: leaves.filter((l) => l.status?.toLowerCase() === status).length,
      fill: STATUS_META[status].color,
    }))
    .filter((d) => d.count > 0);

  // Days by month (last 6 months)
  const now = new Date();
  const byMonth = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const days = leaves
      .filter((l) => {
        const sd = new Date(l.start_date);
        return `${sd.getFullYear()}-${sd.getMonth()}` === key;
      })
      .reduce((s, l) => s + num(l.days), 0);
    return { month: MONTHS[d.getMonth()], days };
  });

  const typeConfig: ChartConfig = { days: { label: "Days" } };
  const statusConfig: ChartConfig = Object.fromEntries(
    Object.entries(STATUS_META).map(([k, v]) => [k, { label: v.label, color: v.color }]),
  );
  const monthConfig: ChartConfig = { days: { label: "Days off", color: "var(--chart-1)" } };

  const hasData = leaves.length > 0;

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

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Time off insights</h2>
        <p className="text-sm text-muted-foreground">
          {isHR ? "Across the team." : "Based on your requests."}
        </p>
      </div>

      {!hasData ? (
        <Card className="mt-4 p-10 text-center text-sm text-muted-foreground">
          No time-off data yet. Once requests come in, charts will appear here.
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <div className="text-sm font-medium">Days by type</div>
            <p className="text-xs text-muted-foreground mb-4">Total leave days per category</p>
            <ChartContainer config={typeConfig} className="h-[240px] w-full">
              <BarChart data={byType} margin={{ left: -12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="days" radius={6}>
                  {byType.map((d) => (
                    <Cell key={d.type} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </Card>

          <Card className="p-6">
            <div className="text-sm font-medium">Requests by status</div>
            <p className="text-xs text-muted-foreground mb-4">Share of pending / approved / rejected</p>
            <ChartContainer config={statusConfig} className="h-[240px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                <Pie data={byStatus} dataKey="count" nameKey="label" innerRadius={55} strokeWidth={2}>
                  {byStatus.map((d) => (
                    <Cell key={d.status} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 -mt-2">
              {byStatus.map((d) => (
                <div key={d.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.fill }} />
                  {d.label} ({d.count})
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <div className="text-sm font-medium">Time off by month</div>
            <p className="text-xs text-muted-foreground mb-4">Total days off over the last 6 months</p>
            <ChartContainer config={monthConfig} className="h-[240px] w-full">
              <BarChart data={byMonth} margin={{ left: -12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="days" fill="var(--color-days)" radius={6} />
              </BarChart>
            </ChartContainer>
          </Card>
        </div>
      )}

    </div>
  );
}
