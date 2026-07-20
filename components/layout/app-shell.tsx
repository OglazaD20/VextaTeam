"use client";

import * as React from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/topbar";
import { ChatRail } from "@/components/layout/chat-rail";
import { Logo } from "@/components/shared/logo";
import { QuickAddTrigger } from "@/components/layout/quick-add-trigger";
import { QuickAddDialog } from "@/components/schedule/quick-add-dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Tables } from "@/types/database";

export function AppShell({
  children,
  user,
  notifications,
}: {
  children: React.ReactNode;
  user: { name: string | null; email: string | null; avatarUrl: string | null };
  notifications: Tables<"notifications">[];
}) {
  const [isMobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <Sheet open={isMobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-4 lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex flex-col gap-6">
            <Logo className="px-2 pt-1" />
            <QuickAddTrigger />
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          user={user}
          notifications={notifications}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <ChatRail />
      <QuickAddDialog />
    </div>
  );
}
