import type { Metadata } from "next";
import { DessinClient } from "./DessinClient";

export const metadata: Metadata = {
  title: "SVG drawing — UI Forge",
  description: "Draw with basic shapes and get the SVG code.",
};

export default function DessinPage() {
  return <DessinClient />;
}
