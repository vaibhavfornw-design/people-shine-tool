import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — Peoplebase" },
      { name: "description", content: "Choose a new password for your Peoplebase HR account." },
      { property: "og:title", content: "Set a new password — Peoplebase" },
      { property: "og:description", content: "Choose a new password for your Peoplebase HR account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a recovery token in the URL hash and
    // establishes a short-lived session on this device. That session is
    // what authorizes updateUser(). Tokens expire on Supabase's side.
    const hash = window.location.hash ?? "";
    const isRecovery = hash.includes("type=recovery");

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecovery && session)) {
        setValidLink(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (isRecovery && data.session) setValidLink(true);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      // Generic message — do not leak whether the token was expired vs invalid.
      toast.error("Could not update password. Request a new reset link and try again.");
      return;
    }
    toast.success("Password updated. You're signed in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
        <Card className="w-full max-w-md p-8 text-sm text-muted-foreground">Loading…</Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
      <Card className="w-full max-w-md p-8">
        <Link to="/auth" className="text-sm text-muted-foreground">← Back to sign in</Link>
        <h1 className="mt-4 text-2xl font-semibold">Set a new password</h1>
        {!validLink ? (
          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-md border bg-muted/50 p-4">
              This reset link is invalid or has expired. Please request a new one.
            </div>
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-6">
            <div>
              <Label>New password</Label>
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
            <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
          </form>
        )}
      </Card>
    </div>
  );
}