"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-card text-card-foreground shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
        },
      }}
    />
  );
}
