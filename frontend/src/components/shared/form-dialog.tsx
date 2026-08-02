import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

/**
 * Animated form dialog wrapper. Wraps shadcn Dialog and adds framer-motion
 * enter/exit + a consistent footer with Cancel / Save.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel,
  loading,
  disabled,
  children,
  size = "md",
}: FormDialogProps) {
  const { t } = useTranslation();
  const width = size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${width} p-0 overflow-hidden`}>
        <AnimatePresence>
          {open ? (
            <motion.form
              key="form-dialog-inner"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
              }}
            >
              <DialogHeader className="border-b px-6 py-4">
                <DialogTitle className="text-base">{title}</DialogTitle>
                {description ? <DialogDescription>{description}</DialogDescription> : null}
              </DialogHeader>
              <div className="scrollbar-thin max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
                {children}
              </div>
              <DialogFooter className="gap-2 border-t bg-surface px-6 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={loading || disabled}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {submitLabel ?? t("common.save")}
                </Button>
              </DialogFooter>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
