import { createFileRoute } from "@tanstack/react-router";
import { PlanBoard } from "@/components/ledger/plan-board";

export const Route = createFileRoute("/plan")({ component: PlanPage });

function PlanPage() {
  return <PlanBoard />;
}
