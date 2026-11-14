import {
  Search,
  Layers,
  User,
  Settings,
  FileText,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/** Maps a `HelpTopic.icon` string (seeded) to a lucide icon, with a sane fallback. */
const ICONS: Record<string, LucideIcon> = {
  search: Search,
  layers: Layers,
  user: User,
  settings: Settings,
  "file-text": FileText,
};

export function HelpTopicIcon({
  icon,
  className,
}: {
  icon?: string | null;
  className?: string;
}) {
  const Icon = (icon && ICONS[icon]) || LifeBuoy;
  return <Icon className={className} />;
}
