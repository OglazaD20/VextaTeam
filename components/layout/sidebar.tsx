import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { QuickAddTrigger } from "@/components/layout/quick-add-trigger";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col gap-6 border-r border-border p-4">
      <Link href="/dashboard" className="px-2 pt-1">
        <Logo />
      </Link>
      <QuickAddTrigger />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
    </div>
  );
}
