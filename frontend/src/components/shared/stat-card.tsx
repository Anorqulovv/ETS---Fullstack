import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  index?: number;
  /** Berilsa, kartochka shu sahifaga link bo'ladi (masalan "/students"). */
  to?: string;
}

export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  icon: Icon,
  index = 0,
  to,
}: StatCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
      className={
        "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft transition-all hover:shadow-elevated" +
        (to ? " cursor-pointer hover:border-primary/40" : "")
      }
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {delta ? (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "flat" && "text-muted-foreground",
              )}
            >
              {delta}
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-transform group-hover:scale-105">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
