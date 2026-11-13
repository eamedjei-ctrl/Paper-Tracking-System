"use client";
import { MotionConfig } from "motion/react";
import { StoreProvider, useStore } from "@/lib/store";
import { ToastProvider } from "./ui";

function Motion({ children }: { children: React.ReactNode }) {
  const { ws } = useStore();
  return <MotionConfig reducedMotion={ws.profile.reduceMotion ? "always" : "user"}>{children}</MotionConfig>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Motion>
        <ToastProvider>{children}</ToastProvider>
      </Motion>
    </StoreProvider>
  );
}
