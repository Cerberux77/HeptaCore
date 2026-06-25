import { Suspense } from "react";
import AcceptInvitationClient from "./accept-invitation-client";

export const dynamic = "force-dynamic";
export default function AcceptPage() { return <Suspense><AcceptInvitationClient /></Suspense>; }
