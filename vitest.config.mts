import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/security.test.ts", "tests/realm.test.mjs", "tests/license.test.mjs", "tests/demo.test.ts"],
    environment: "node",
    fileParallelism: false,
  },
});
