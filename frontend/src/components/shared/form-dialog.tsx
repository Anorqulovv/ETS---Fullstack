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
  size?: "sm" | "md" | "lg" | "xl";
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
  const width =
    size === "sm"
      ? "sm:max-w-sm"
      : size === "lg"
        ? "sm:max-w-2xl"
        : size === "xl"
          ? "sm:max-w-3xl"
          : "sm:max-w-lg";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${width} flex max-h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden p-0`}
      >
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
              className="flex min-h-0 flex-1 flex-col"
            >
              <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
                <DialogTitle className="pr-8 text-base">{title}</DialogTitle>
                {description ? <DialogDescription>{description}</DialogDescription> : null}
              </DialogHeader>
              <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                {children}
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t bg-surface px-4 py-3 sm:px-6">
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
