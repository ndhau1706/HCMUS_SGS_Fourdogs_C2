import { loadTideConfig, publicConfig } from "@/lib/auth/tidecloakConfig";
import { json } from "@/lib/auth/protect";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return json(publicConfig(loadTideConfig()));
  } catch {
    return json(
      { error: "TideCloak setup is required. Follow docs/SETUP.md." },
      503,
    );
  }
}
