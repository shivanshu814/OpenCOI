"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * App-wide toast host. Brand tones: mint success, amber warning, red error,
 * ink/neutral info. Bottom-right on desktop; top-center on narrow viewports.
 * Durations are set per-call in `lib/ui/toast.ts` (errors slightly longer).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const apply = () => setMobile(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  return (
    <Sonner
      theme="light"
      className="toaster group"
      position={mobile ? "top-center" : "bottom-right"}
      closeButton
      richColors={false}
      icons={{
        success: <CircleCheckIcon className="size-4 text-[var(--brand)]" />,
        info: <InfoIcon className="size-4 text-[var(--ink)]" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--brand-muted)",
          "--success-border": "color-mix(in oklab, var(--brand) 35%, transparent)",
          "--success-text": "var(--foreground)",
          "--error-bg": "color-mix(in oklab, var(--destructive) 8%, white)",
          "--error-border": "color-mix(in oklab, var(--destructive) 35%, transparent)",
          "--error-text": "var(--foreground)",
          "--warning-bg": "oklch(0.97 0.03 85)",
          "--warning-border": "oklch(0.85 0.08 75)",
          "--warning-text": "var(--foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:font-sans",
          title: "text-sm font-medium",
          description: "text-muted-foreground text-xs",
          success:
            "group-[.toaster]:bg-[var(--success-bg)] group-[.toaster]:border-[var(--success-border)]",
          error:
            "group-[.toaster]:bg-[var(--error-bg)] group-[.toaster]:border-[var(--error-border)]",
          warning:
            "group-[.toaster]:bg-[var(--warning-bg)] group-[.toaster]:border-[var(--warning-border)]",
          info: "group-[.toaster]:bg-popover",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
