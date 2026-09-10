import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Bus,
  CircleDot,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  PiggyBank,
  Shield,
  ShoppingBag,
  Sofa,
  Store,
  Utensils,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { CategoryId } from "@/lib/ledger/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  transport: Bus,
  housing: Home,
  bills: Zap,
  shopping: ShoppingBag,
  health: HeartPulse,
  fun: Clapperboard,
  education: GraduationCap,
  family: Users,
  household: Sofa,
  insurance: Shield,
  saving: PiggyBank,
  salary: Wallet,
  freelance: Briefcase,
  business: Store,
  other: CircleDot,
};

export function CategoryGlyph({
  id,
  className,
}: {
  id: CategoryId;
  className?: string;
}) {
  const Icon = ICONS[id] ?? CircleDot;
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md bg-secondary text-primary",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
