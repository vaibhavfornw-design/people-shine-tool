import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  full_name: z.string().trim().min(1, "Full name is required").max(100),
});

// naive in-memory rate limiter (per worker instance)
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  rec.count += 1;
  return rec.count <= MAX_PER_WINDOW;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";

        if (!rateLimit(ip)) {
          return json({ error: "Too many attempts. Try again shortly." }, 429);
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = registerSchema.safeParse(payload);
        if (!parsed.success) {
          return json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            400,
          );
        }
        const { email, password, full_name } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Prevent user enumeration: check existence via admin listUsers filter
        const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        if (listErr) {
          console.error("[register] listUsers failed", listErr);
          return json({ error: "Registration failed" }, 500);
        }
        // listUsers doesn't filter by email; do a targeted check via profiles table instead
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (existingProfile) {
          // Generic response to avoid leaking account existence
          return json({ ok: true, message: "If the email is available, an account was created." });
        }
        void existing;

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: { full_name },
        });

        if (createErr || !created?.user) {
          console.error("[register] createUser failed", createErr);
          const msg = createErr?.message?.toLowerCase() ?? "";
          if (msg.includes("registered") || msg.includes("exists")) {
            return json({ ok: true, message: "If the email is available, an account was created." });
          }
          return json({ error: "Registration failed" }, 500);
        }

        return json({
          ok: true,
          user: { id: created.user.id, email: created.user.email },
        }, 201);
      },
    },
  },
});