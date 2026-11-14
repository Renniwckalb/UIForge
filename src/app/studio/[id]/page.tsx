import { Suspense } from "react";
import { StudioRoute } from "./StudioRoute";
import { Loading } from "@/i18n/Loading";

export default function StudioPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudioRoute />
    </Suspense>
  );
}
