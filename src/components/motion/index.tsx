"use client";

export { motion, AnimatePresence } from "framer-motion";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  className?: string;
};

export function FadeIn({
  delay = 0,
  y = 12,
  className,
  children,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type StaggerContainerProps = HTMLMotionProps<"div"> & {
  className?: string;
};

export function StaggerContainer({
  className,
  children,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.06,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = HTMLMotionProps<"div"> & {
  className?: string;
};

export function StaggerItem({
  className,
  children,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
