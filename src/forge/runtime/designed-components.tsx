"use client";
import type { ComponentType } from "react";
import { ShimmerButton } from "@/vendor/ui/shimmer-button";
import { BorderBeam } from "@/vendor/ui/border-beam";
import { DotPattern } from "@/vendor/ui/dot-pattern";
import { Marquee } from "@/vendor/ui/marquee";
import { WordRotate } from "@/vendor/ui/word-rotate";
import { AnimatedGridPattern } from "@/vendor/ui/animated-grid-pattern";
import { TextAnimate } from "@/vendor/ui/text-animate";

/** Composants « Designés » : sources Magic UI (licence MIT) copiées par le CLI shadcn */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DESIGNED_COMPONENTS: Record<string, ComponentType<any>> = {
  ShimmerButton,
  BorderBeam,
  DotPattern,
  Marquee,
  WordRotate,
  AnimatedGridPattern,
  TextAnimate,
};
