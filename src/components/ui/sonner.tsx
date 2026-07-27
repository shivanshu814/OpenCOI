"use client"

import { Spinner } from "@/components/ui/spinner"
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * App-wide toast host. Brand tones: mint success, amber warning, red error,
 * ink/neutral info. Bottom-right on desktop; top-center on narrow viewports.
 * Durations are set per-call in `lib/ui/toast.ts` (errors slightly longer).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
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
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "light"}
      className="toaster group"
      position={mobile ? "top-center" : "bottom-right"}
      closeButton
      richColors={false}
      icons={{
        success: <CircleCheckIcon className="size-4 text-[var(--brand)]" />,
        info: <InfoIcon className="size-4 text-[var(--ink)]" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Spinner size={16} />,
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
          "--error-bg":
            "color-mix(in oklab, var(--destructive) 10%, var(--popover))",
          "--error-border": "color-mix(in oklab, var(--destructive) 35%, transparent)",
          "--error-text": "var(--foreground)",
          "--warning-bg": "color-mix(in oklab, oklch(0.8 0.13 80) 14%, var(--popover))",
          "--warning-border": "color-mix(in oklab, oklch(0.8 0.13 80) 45%, transparent)",
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
