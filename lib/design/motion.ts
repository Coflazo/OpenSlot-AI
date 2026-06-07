import type { Transition, Variants } from "framer-motion";

export const spring: Transition = { type: "spring", stiffness: 280, damping: 28, mass: 0.8 };
export const springSoft: Transition = { type: "spring", stiffness: 140, damping: 18 };
export const ease: Transition = { duration: 0.32, ease: [0.16, 1, 0.3, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: ease }
};

export const list: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 }
  }
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring }
};

export const drawerSlide: Variants = {
  hidden: { x: "100%" },
  show: { x: 0, transition: spring },
  exit: { x: "100%", transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }
};
