import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leave")({
  component: LeavePage,
});

function diffDays(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function LeavePage() {
  const { user, isHR } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", leave_type: "vacation", reason: "" });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["leave", user?.id, isHR],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set(data.map((d) => d.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
    },
    enabled: !!user,
  });

  const submit = async () => {
    if (!form.start_date || !form.end_date) return;
    const days = diffDays(form.start_date, form.end_date);
    const { error } = await supabase.from("leave_requests").insert({
      user_id: user!.id,
      start_date: form.start_date,
      end_date: form.end_date,
      leave_type: form.leave_type,
      reason: form.reason,
      days,
    });
    if (error) return toast.error(error.message);
    toast.success("Request submitted");
    setOpen(false);
    setForm({ start_date: "", end_date: "", leave_type: "vacation", reason: "" });
    qc.invalidateQueries({ queryKey: ["leave"] });
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, decided_by: user!.id, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Request ${status}`);
    qc.invalidateQueries({ queryKey: ["leave"] });
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("leave_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["leave"] });
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Time off</h1>
          <p className="text-sm text-muted-foreground">{isHR ? "All team requests." : "Your leave requests."}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request time off</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reason (optional)</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              {form.start_date && form.end_date && (
                <div className="text-sm text-muted-foreground">Total: {diffDays(form.start_date, form.end_date)} day(s)</div>
              )}
            </div>
            <DialogFooter><Button onClick={submit}>Submit</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              {isHR && <TableHead>Employee</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requests yet.</TableCell></TableRow>}
            {requests.map((r: any) => (
              <TableRow key={r.id}>
                {isHR && <TableCell className="font-medium">{r.profile?.full_name ?? r.profile?.email ?? "—"}</TableCell>}
                <TableCell className="capitalize">{r.leave_type}</TableCell>
                <TableCell>{r.start_date} → {r.end_date}</TableCell>
                <TableCell>{r.days}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason || "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {isHR && r.status === "pending" && (
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => decide(r.id, "approved")}><Check className="h-4 w-4 text-green-600" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => decide(r.id, "rejected")}><X className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  )}
                  {!isHR && r.user_id === user?.id && r.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}