"use client";

import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  easeOut,
  motion,
  useReducedMotion,
} from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: shouldReduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduce ? 0 : 0.2, ease: easeOut }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
