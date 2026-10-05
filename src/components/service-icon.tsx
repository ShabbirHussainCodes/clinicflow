import {
  Baby,
  ClipboardList,
  Heart,
  Repeat,
  Sparkles,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  repeat: Repeat,
  baby: Baby,
  syringe: Syringe,
  sparkles: Sparkles,
  heart: Heart,
  clipboard: ClipboardList,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Stethoscope;
  return <Icon className={className} aria-hidden="true" />;
}
