import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Building2,
  Bus,
  CircleDot,
  Clapperboard,
  CreditCard,
  GraduationCap,
  HeartPulse,
  Home,
  PiggyBank,
  Shield,
  ShoppingBag,
  Smartphone,
  Sofa,
  Store,
  Utensils,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { CategoryId, WalletKind } from "@/lib/ledger/types";
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
  transfer: ArrowLeftRight,
};

const WALLET_ICONS: Record<WalletKind, LucideIcon> = {
  cash: Banknote,
  bank: Building2,
  credit_card: CreditCard,
  ewallet: Smartphone,
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

export function WalletGlyph({
  kind,
  className,
}: {
  kind: WalletKind;
  className?: string;
}) {
  const Icon = WALLET_ICONS[kind] ?? Wallet;
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
