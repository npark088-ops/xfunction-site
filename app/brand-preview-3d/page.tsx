import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewClient from "./PreviewClient";

// DEV-ONLY page for choosing a 3D hero mark. Not linked from anywhere, marked
// noindex, and a production build answers 404 here (so none of the 3D code is
// ever reachable in production).
export const metadata: Metadata = {
  title: "Brand preview 3D (dev only)",
  robots: { index: false, follow: false },
};

export default function BrandPreview3DPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewClient />;
}
