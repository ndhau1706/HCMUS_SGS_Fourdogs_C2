import { withAuth, json } from "@/lib/auth/protect";
import { resources } from "@/lib/store";
export const GET = withAuth(async () =>
  json({ resources: resources(), synthetic: true }),
);
