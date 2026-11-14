"use client";
import { useParams } from "next/navigation";
import { Studio } from "@/studio/Studio";

export function StudioRoute() {
  const { id } = useParams<{ id: string }>();
  return <Studio id={id} />;
}
