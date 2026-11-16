import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroPreviewClient from "./HeroPreviewClient";

// DEV-ONLY preview of an animated xFunction hero. Not linked from anywhere,
// marked noindex, and a production build answers 404 here.
export const metadata: Metadata = {
  title: "Hero preview (dev only)",
  robots: { index: false, follow: false },
};

export default function HeroPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HeroPreviewClient />;
}
