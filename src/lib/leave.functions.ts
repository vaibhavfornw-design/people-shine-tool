import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const decideLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "approved" | "rejected" }) => {
    if (!input?.id || (input.status !== "approved" && input.status !== "rejected")) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("decide_leave_request", {
      _id: data.id,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });