"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  easeOut,
} from "framer-motion";

interface AnimatedExpenseListProps {
  listKey: string;
  children: React.ReactNode[];
}

export function AnimatedExpenseList({
  listKey,
  children,
}: AnimatedExpenseListProps) {
  const shouldReduce = useReducedMotion();

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduce ? 0 : 0.25,
        ease: easeOut,
        delay: shouldReduce ? 0 : i * 0.04,
      },
    }),
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={listKey}>
        {children.map((child, i) => (
          <motion.div
            custom={i}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            key={i}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
