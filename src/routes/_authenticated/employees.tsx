import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { isHR } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", job_title: "", department: "", phone: "", hire_date: "" });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = employees.filter((e) =>
    [e.full_name, e.email, e.job_title, e.department].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  const add = async () => {
    const { error } = await supabase.from("employees").insert({
      ...form,
      hire_date: form.hire_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Employee added");
    setOpen(false);
    setForm({ full_name: "", email: "", job_title: "", department: "", phone: "", hire_date: "" });
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this employee?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total</p>
        </div>
        {isHR && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add employee</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New employee</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Job title</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
                  <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Hire date</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={add} disabled={!form.full_name || !form.email}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="mt-6">
        <div className="p-4 border-b flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, department…" value={q} onChange={(e) => setQ(e.target.value)} className="border-0 shadow-none focus-visible:ring-0" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PTO</TableHead>
              {isHR && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employees yet.</TableCell></TableRow>}
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name}</TableCell>
                <TableCell>{e.job_title ?? "—"}</TableCell>
                <TableCell>{e.department ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{e.email}</TableCell>
                <TableCell><Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                <TableCell>{e.pto_balance} days</TableCell>
                {isHR && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}