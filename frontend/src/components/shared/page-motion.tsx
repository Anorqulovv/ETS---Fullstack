import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Wrap a page body so every route transitions the same way. */
export function PageMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}
