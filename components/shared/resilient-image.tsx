"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ImageOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

/**
 * For external, non-optimizable image sources (map tiles, event artwork from
 * arbitrary CDNs) that next/image can't proxy without a fixed allowlist of
 * remote hosts. Shows a placeholder while loading, retries a couple of times
 * on failure (transient network blips), and falls back to a stable icon
 * block instead of ever rendering a broken-image icon.
 */
export function ResilientImage({
  src,
  alt,
  className,
  fallbackIcon: FallbackIcon = ImageOffIcon,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: LucideIcon;
}) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");
  const [retryCount, setRetryCount] = React.useState(0);
  const [displaySrc, setDisplaySrc] = React.useState(src);
  const [prevSrc, setPrevSrc] = React.useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setStatus("loading");
    setRetryCount(0);
    setDisplaySrc(src);
  }

  function handleError() {
    if (retryCount >= MAX_RETRIES) {
      setStatus("error");
      return;
    }
    const nextAttempt = retryCount + 1;
    window.setTimeout(() => {
      setRetryCount(nextAttempt);
      const separator = src.includes("?") ? "&" : "?";
      setDisplaySrc(`${src}${separator}retry=${nextAttempt}`);
    }, RETRY_DELAY_MS * nextAttempt);
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted text-muted-foreground",
          className,
        )}
      >
        <FallbackIcon className="size-8" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted", className)}>
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {/* eslint-disable-next-line @next/next/no-img-element -- external, non-optimizable source (arbitrary CDN host) */}
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={handleError}
        className={cn(
          "size-full object-cover transition-opacity duration-300",
          status === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
