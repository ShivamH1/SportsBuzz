import { Button } from "@/components/ui/button";
import { useSportsStore } from "@/store/useSportsStore";
import { motion, AnimatePresence } from "framer-motion";

export function NewMatchBanner() {
    const newMatchesCount = useSportsStore((state) => state.newMatchesCount);
    const dismissNewMatchesBanner = useSportsStore((state) => state.dismissNewMatchesBanner);

    return (
        <AnimatePresence>
            {newMatchesCount > 0 && (
                <motion.div
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                >
                    <div className="neo-border bg-brand-yellow p-4 rounded-2xl flex items-center justify-between neo-shadow">
                        <p className="font-bold text-sm uppercase tracking-tight">
                            {newMatchesCount} new {newMatchesCount === 1 ? 'match' : 'matches'} added
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="neo-border bg-white hover:bg-zinc-100 rounded-xl h-9 px-6 font-black text-xs uppercase transition-transform active:scale-95"
                            onClick={dismissNewMatchesBanner}
                        >
                            Dismiss
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
