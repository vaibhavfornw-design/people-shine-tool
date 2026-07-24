import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — Peoplebase" },
      { name: "description", content: "Request a password reset link for your Peoplebase HR account." },
      { property: "og:title", content: "Reset password — Peoplebase" },
      { property: "og:description", content: "Request a password reset link for your Peoplebase HR account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

// Per-browser cooldown to blunt casual enumeration attempts on top of
// Supabase's server-side auth email rate limit.
const COOLDOWN_MS = 30_000;

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const last = Number(sessionStorage.getItem("pwreset_last") ?? 0);
    if (Date.now() - last < COOLDOWN_MS) {
      setBusy(false);
      setSent(true);
      return;
    }
    sessionStorage.setItem("pwreset_last", String(Date.now()));
    // Fire and forget: never surface whether the email exists.
    supabase.auth
      .resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      .catch(() => {});
    setBusy(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
      <Card className="w-full max-w-md p-8">
        <Link to="/auth" className="text-sm text-muted-foreground">← Back to sign in</Link>
        <h1 className="mt-4 text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we'll send you a link to set a new password. The link expires shortly for security.
        </p>
        {sent ? (
          <div className="mt-6 rounded-md border bg-muted/50 p-4 text-sm">
            If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-6">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}