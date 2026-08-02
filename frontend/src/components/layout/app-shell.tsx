import { useState, type ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopNav } from "./top-nav";
import { CommandPalette } from "./command-palette";
import { useEffect } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Trigger palette state from anywhere via a custom event
  useEffect(() => {
    const handler = () => setPaletteOpen(true);
    window.addEventListener("edu-crm:open-palette", handler);
    return () => window.removeEventListener("edu-crm:open-palette", handler);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopNav
            onOpenPalette={() => window.dispatchEvent(new CustomEvent("edu-crm:open-palette"))}
          />
          <main className="scrollbar-thin flex-1 overflow-x-hidden p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </SidebarInset>
      </div>
      <CommandPalette />
      {/* Keep palette in DOM so the shortcut listener stays wired */}
      {paletteOpen ? null : null}
    </SidebarProvider>
  );
}
