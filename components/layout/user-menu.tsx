"use client";

import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { useTranslations } from "@/components/i18n/i18n-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REWARDS_BY_ID } from "@/lib/rewards/rewards";
import { cn } from "@/lib/utils";

export function UserMenu({
  name,
  email,
  avatarUrl,
  equippedFrameId,
}: {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  equippedFrameId: string;
}) {
  const { messages } = useTranslations();
  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const frame = REWARDS_BY_ID.get(equippedFrameId)?.frame;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span
          className={cn("flex rounded-full p-0.5", frame?.legendary && "reward-frame-legendary")}
          style={frame?.ringColor ? { boxShadow: `0 0 0 2px ${frame.ringColor}` } : undefined}
        >
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? "Avatar"} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">
            {name ?? messages.topbar.account}
          </p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserIcon /> {messages.topbar.profile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon /> {messages.nav.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" asChild>
          <form action={signOut} className="contents">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOutIcon /> {messages.common.signOut}
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
