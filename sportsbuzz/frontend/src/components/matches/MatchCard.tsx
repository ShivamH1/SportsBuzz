import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Match } from "@/types/sports";
import { format } from "date-fns";
import { useSportsStore } from "@/store/useSportsStore";
import { wsClient } from "@/lib/ws";
import { TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface MatchCardProps {
    match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
    const setActiveMatch = useSportsStore((state) => state.setActiveMatch);
    const activeMatchId = useSportsStore((state) => state.activeMatchId);
    const isSelected = activeMatchId === match.id;

    // Track previous scores to show "Recent Score" indicator
    const prevHomeScore = useRef(match.homeScore);
    const prevAwayScore = useRef(match.awayScore);
    const [showHomeIndicator, setShowHomeIndicator] = useState(false);
    const [showAwayIndicator, setShowAwayIndicator] = useState(false);

    useEffect(() => {
        if (match.homeScore > prevHomeScore.current) {
            setShowHomeIndicator(true);
            const timer = setTimeout(() => setShowHomeIndicator(false), 5000);
            prevHomeScore.current = match.homeScore;
            return () => clearTimeout(timer);
        }
        prevHomeScore.current = match.homeScore;
    }, [match.homeScore]);

    useEffect(() => {
        if (match.awayScore > prevAwayScore.current) {
            setShowAwayIndicator(true);
            const timer = setTimeout(() => setShowAwayIndicator(false), 5000);
            prevAwayScore.current = match.awayScore;
            return () => clearTimeout(timer);
        }
        prevAwayScore.current = match.awayScore;
    }, [match.awayScore]);

    const handleWatch = () => {
        setActiveMatch(match.id);
        wsClient.subscribe(match.id);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        wsClient.unsubscribe(match.id);
        setActiveMatch(null);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "neo-card p-6 flex flex-col gap-6",
                isSelected ? "border-black neo-shadow-lg ring-4 ring-brand-blue/30 bg-blue-50/30" : ""
            )}
        >
            {/* Top row: Sport and Live status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-black rounded-full" />
                    <Badge variant="outline" className="neo-border-thin py-0.5 px-3 font-black text-[10px] uppercase tracking-widest bg-zinc-50 rounded-lg">
                        {match.sport}
                    </Badge>
                </div>

                <AnimatePresence>
                    {match.status === 'live' && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full neo-border-thin"
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="font-black text-[10px] text-red-600 tracking-widest">LIVE</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Teams and Scores */}
            <div className="space-y-6 relative">
                <div className="flex items-center justify-between group">
                    <div className="flex flex-col">
                        <span className="font-black text-2xl uppercase tracking-tighter transition-all group-hover:translate-x-1">{match.homeTeam}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Home Team</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <AnimatePresence>
                            {showHomeIndicator && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10, scale: 0.5 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -10, scale: 0.5 }}
                                    className="p-1.5 bg-brand-green neo-border-thin rounded-lg"
                                >
                                    <TrendingUp className="w-4 h-4 text-black" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className={cn(
                            "neo-border px-4 py-2 font-black text-3xl rounded-xl min-w-[60px] text-center transition-all duration-500",
                            isSelected ? "bg-brand-yellow neo-shadow-sm" : "bg-white",
                            showHomeIndicator && "bg-brand-green scale-110 !neo-shadow-sm"
                        )}>
                            {match.homeScore}
                        </div>
                    </div>
                </div>

                {/* VS Divider */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <span className="text-6xl font-black">VS</span>
                </div>

                <div className="flex items-center justify-between group">
                    <div className="flex flex-col">
                        <span className="font-black text-2xl uppercase tracking-tighter transition-all group-hover:translate-x-1">{match.awayTeam}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Away Team</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <AnimatePresence>
                            {showAwayIndicator && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10, scale: 0.5 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -10, scale: 0.5 }}
                                    className="p-1.5 bg-brand-green neo-border-thin rounded-lg"
                                >
                                    <TrendingUp className="w-4 h-4 text-black" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className={cn(
                            "neo-border px-4 py-2 font-black text-3xl rounded-xl min-w-[60px] text-center transition-all duration-500",
                            isSelected ? "bg-brand-yellow neo-shadow-sm" : "bg-white",
                            showAwayIndicator && "bg-brand-green scale-110 !neo-shadow-sm"
                        )}>
                            {match.awayScore}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Row */}
            <div className="flex items-end justify-between mt-auto pt-6 border-t-4 border-black/5">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 leading-none">Kickoff Time</span>
                    <div className="h-10 px-4 flex items-center bg-zinc-100 rounded-xl neo-border-thin font-black text-xs uppercase tracking-tight">
                        {format(new Date(match.startTime), 'p')}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isSelected ? (
                        <Button
                            size="sm"
                            onClick={handleWatch}
                            className="neo-btn h-10 px-8 rounded-xl text-[11px] bg-brand-yellow hover:neo-shadow-sm flex items-center justify-center font-extrabold uppercase"
                        >
                            Watch Feed
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            className="neo-btn bg-brand-blue hover:bg-brand-blue/80 h-10 px-6 rounded-xl text-[11px] flex items-center font-extrabold uppercase border-black"
                            onClick={handleClose}
                        >
                            <span className="text-xl mr-1.5 leading-none opacity-50 relative -top-0.5">×</span>
                            Close Feed
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
