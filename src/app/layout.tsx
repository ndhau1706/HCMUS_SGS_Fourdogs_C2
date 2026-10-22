import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "CloudGuard — Zero-Trust Infrastructure Governance",
  description:
    "Collaborative infrastructure access through TideCloak quorum governance. Synthetic infrastructure, verified privileges.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
