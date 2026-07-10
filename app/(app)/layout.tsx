"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NookProvider } from "@/lib/store";
import { isAuthed } from "@/lib/auth";
import IconRail from "@/components/IconRail";

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  // Hold the shell until the auth check resolves (avoids a flash of the app).
  if (!ready) {
    return (
      <div
        style={{
          height: "100vh",
          background: "var(--surface-canvas)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: "var(--surface-base)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      <IconRail />
      {children}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NookProvider>
      <AppShell>{children}</AppShell>
    </NookProvider>
  );
}
