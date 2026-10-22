import { withAuth, json } from "@/lib/auth/protect";
import { resources } from "@/lib/store";
export const GET = withAuth(async (req) => {
  const resource = resources().find(
    (r) => r.id === new URL(req.url).pathname.split("/")[3],
  );
  return resource
    ? json({
        resource,
        synthetic: true,
        health: "healthy",
        checks: [
          "Synthetic service reachable",
          "Synthetic storage available",
          "Synthetic process running",
        ],
      })
    : json({ error: "Unknown infrastructure resource." }, 404);
});
