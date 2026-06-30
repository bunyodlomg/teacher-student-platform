"use client";

import { useSession } from "@/store/session";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IconButton } from "./Button";

export function ThemeToggle() {
  const theme = useSession((s) => s.theme);
  const toggle = useSession((s) => s.toggleTheme);
  const isDark = theme === "dark";
  return (
    <IconButton label="Toggle theme" onClick={toggle}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.6 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}
