import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const BACKGROUND_COLORS = [
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
] as const;

function pickBackgroundColor(id: number) {
  return BACKGROUND_COLORS[id % BACKGROUND_COLORS.length];
}

interface AppAvatarProps {
  avatarUrl: string;
  name: string;
  userId: number;
  className?: string;
  online?: boolean;
  size?: "default" | "sm" | "lg";
}

export default function AppAvatar({
  avatarUrl,
  className,
  name,
  online = false,
  size = "default",
  userId,
}: AppAvatarProps) {
  return (
    <Avatar className={className} size={size}>
      {avatarUrl ? <AvatarImage alt={name} src={avatarUrl} /> : null}
      <AvatarFallback
        className="text-white"
        style={{ backgroundColor: pickBackgroundColor(userId) }}
      >
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
      {online ? (
        <AvatarBadge className={cn("bg-emerald-500 ring-2 ring-white")} />
      ) : null}
    </Avatar>
  );
}
