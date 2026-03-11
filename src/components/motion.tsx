import { motion, MotionProps } from "framer-motion";
import type { PropsWithChildren, HTMLAttributes } from "react";

type DivMotionProps = MotionProps & HTMLAttributes<HTMLDivElement>;

export function PageTransition({ children, ...props }: PropsWithChildren<DivMotionProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, ...props }: PropsWithChildren<DivMotionProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = PropsWithChildren<{
  delay?: number;
  className?: string;
}>;

export function StaggerContainer({ children, delay = 0.08, className }: StaggerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: PropsWithChildren<DivMotionProps>) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({ children, ...props }: PropsWithChildren<DivMotionProps>) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.06,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

