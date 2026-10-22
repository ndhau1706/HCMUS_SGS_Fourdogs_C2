import { withAuth, json } from "@/lib/auth/protect";
import { activity } from "@/lib/store";
export const GET = withAuth(async () =>
  json({
    events: activity(),
    scope:
      "Shared application log, current process, latest 300 events. Not the Tide QEA audit trail.",
  }),
);
