import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "neo-border-thin p-3 rounded-2xl transition-all duration-300 relative overflow-hidden group active:scale-95",
                theme === 'light' ? "bg-white hover:bg-zinc-50" : "bg-zinc-900 hover:bg-zinc-800"
            )}
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={theme}
                    initial={{ y: 20, opacity: 0, rotate: theme === 'light' ? -45 : 45 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: theme === 'light' ? 45 : -45 }}
                    transition={{ duration: 0.2, ease: "backOut" }}
                >
                    {theme === 'light' ? (
                        <Moon className="w-5 h-5 text-black" fill="currentColor" />
                    ) : (
                        <Sun className="w-5 h-5 text-brand-yellow" fill="currentColor" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Hover Indicator */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none",
                theme === 'light' ? "bg-black" : "bg-white"
            )} />
        </button>
    );
}
