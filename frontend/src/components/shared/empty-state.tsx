import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-16 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-base font-semibold text-foreground">{title}</div>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </motion.div>
  );
}
