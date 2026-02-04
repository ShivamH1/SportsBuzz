import { useSportsStore } from "@/store/useSportsStore";
import { useCommentary } from "@/hooks/useCommentary";
import { format } from "date-fns";
import { Tv, MessageSquare, Zap, Target, User, Info, Loader2, Radio } from "lucide-react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useEffect, useRef } from "react";

const EMPTY_ARRAY: any[] = [];

export function CommentarySidebar() {
    const activeMatchId = useSportsStore((state) => state.activeMatchId);
    const matches = useSportsStore((state) => state.matches);
    const commentary = useSportsStore((state) => state.commentaryByMatchId[activeMatchId || 0] ?? EMPTY_ARRAY);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const { isLoading, isError, refetch } = useCommentary(activeMatchId);
    const activeMatch = activeMatchId ? matches[activeMatchId] : null;

    // Auto-scroll to top when new commentary arrives
    useEffect(() => {
        if (virtuosoRef.current && commentary.length > 0) {
            virtuosoRef.current.scrollToIndex({
                index: 0,
                behavior: 'smooth',
                align: 'start'
            });
        }
    }, [commentary.length]);

    if (!activeMatchId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background transition-colors duration-300">
                <div className="w-20 h-20 rounded-full bg-brand-yellow neo-border flex items-center justify-center neo-shadow">
                    <Tv className="w-10 h-10 text-black" />
                </div>
                <div className="max-w-[280px]">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground">No Match Selected</h3>
                    <p className="font-bold text-sm mt-3 uppercase tracking-tight text-foreground/60">
                        Select a match from the list to view live commentary and real-time updates.
                    </p>
                </div>
            </div>
        );
    }

    const getEventIcon = (type: string) => {
        switch (type.toUpperCase()) {
            case 'GOAL': return <Target className="w-4 h-4 text-emerald-600" />;
            case 'YELLOW_CARD': return <div className="w-3 h-4 bg-yellow-400 neo-border rounded-sm" />;
            case 'RED_CARD': return <div className="w-3 h-4 bg-red-600 neo-border rounded-sm" />;
            case 'SUBSTITUTION': return <Zap className="w-4 h-4 text-brand-blue" />;
            default: return <Info className="w-4 h-4 text-foreground/40" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-card transition-colors duration-300">
            {/* Sidebar Header */}
            <div className="p-6 neo-border border-b-[6px] border-border bg-brand-yellow flex items-center justify-between mb-0 relative z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-card neo-border-thin rounded-xl shadow-[4px_4px_0px_0px_var(--border)]">
                        <MessageSquare className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl uppercase tracking-tighter leading-tight text-black">Live Feed</h3>
                        <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest leading-none">Match Commentary</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="bg-black text-white px-3 py-1 font-black text-[10px] uppercase rounded-lg animate-pulse tracking-widest neo-shadow-sm border border-black dark:border-white">
                        Live
                    </div>
                </div>
            </div>

            {/* Match Context Bar */}
            <div className="px-6 py-4 bg-muted text-foreground flex flex-col gap-0.5 relative z-10 border-b-2 border-border">
                <div className="flex items-center gap-2 mb-1">
                    <Radio className="w-3 h-3 text-brand-green animate-pulse" />
                    <p className="text-[9px] font-black uppercase text-foreground/40 tracking-[0.2em] leading-none">Currently Broadcasting</p>
                </div>
                <h4 className="font-black text-sm uppercase truncate tracking-tight text-brand-yellow drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                    {activeMatch?.homeTeam} <span className="bg-foreground/10 px-1.5 py-0.5 rounded-md text-foreground mx-1 text-xs">
                        {activeMatch?.homeScore}
                        {activeMatch?.sport?.toLowerCase() === 'cricket' && `/${activeMatch?.homeWickets}`}
                    </span>
                    <span className="text-foreground/30 mx-1">:</span>
                    <span className="bg-foreground/10 px-1.5 py-0.5 rounded-md text-foreground mx-1 text-xs">
                        {activeMatch?.awayScore}
                        {activeMatch?.sport?.toLowerCase() === 'cricket' && `/${activeMatch?.awayWickets}`}
                    </span> {activeMatch?.awayTeam}
                </h4>
            </div>

            {/* Main Feed */}
            <div className="flex-1 overflow-hidden relative bg-muted/30">
                {isLoading && commentary.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm z-20 space-y-6">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 animate-spin text-black" />
                            <Radio className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-brand-yellow" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm uppercase tracking-[0.3em] text-foreground">Syncing Feed</p>
                            <p className="text-[10px] font-bold text-foreground/40 uppercase mt-1">Retrieving latest match events</p>
                        </div>
                    </div>
                ) : isError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-red-500/5">
                        <div className="w-20 h-20 rounded-2xl bg-card neo-border flex items-center justify-center text-red-600 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]">
                            <Info className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-black text-xl uppercase tracking-tighter text-foreground">Connection Lost</h4>
                            <p className="text-xs font-bold text-foreground/40 uppercase leading-relaxed max-w-[200px] mx-auto">We've lost touch with the commentary satellite.</p>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="neo-btn bg-brand-yellow hover:neo-shadow active:translate-x-1 active:translate-y-1 transition-all rounded-xl"
                        >
                            Re-Establish Feed
                        </button>
                    </div>
                ) : commentary.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 opacity-20">
                            <Zap className="w-8 h-8 text-foreground" />
                        </div>
                        <p className="font-black text-[10px] uppercase tracking-[0.4em] text-foreground/20">Awaiting First Event</p>
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={commentary}
                        totalCount={commentary.length}
                        initialTopMostItemIndex={0}
                        followOutput="smooth"
                        itemContent={(_index, event) => (
                            <div className="p-6 border-b-2 border-foreground/5 hover:bg-card group transition-all">
                                <div className="flex gap-5">
                                    {/* Event Meta */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="neo-border-thin bg-black text-brand-yellow px-2 py-1.5 font-black text-xs rounded-xl min-w-[50px] text-center shadow-[3px_3px_0px_0px_var(--border)] group-hover:shadow-[3px_3px_0px_0px_rgba(112,209,255,1)] transition-all">
                                            {event.minute}'
                                        </div>
                                        <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest vertical-text">
                                            #{event.sequence}
                                        </span>
                                        <div className="w-1 h-full bg-foreground/5 rounded-full group-last:hidden" />
                                    </div>

                                    {/* Event Content */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 bg-muted rounded-lg group-hover:bg-brand-yellow/20 transition-colors">
                                                    {getEventIcon(event.eventType)}
                                                </div>
                                                <span className="font-black text-[10px] uppercase tracking-[0.1em] text-foreground">
                                                    {event.eventType.replace('_', ' ')} <span className="text-foreground/20 mx-1">•</span> {event.period}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-black text-foreground/40 font-mono tracking-tighter">
                                                {format(new Date(event.createdAt), 'HH:mm:ss')}
                                            </span>
                                        </div>

                                        <div className="neo-border-thin bg-card p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.03)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.03)] group-hover:shadow-[6px_6px_0px_0px_var(--border)] group-hover:ring-4 group-hover:ring-brand-yellow/10 transition-all group-hover:-translate-x-1 group-hover:-translate-y-1 relative overflow-hidden">
                                            {/* Decorative accent */}
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-muted rounded-full -mr-8 -mt-8 opacity-40" />

                                            <p className="font-bold text-[15px] leading-relaxed text-foreground relative z-10">{event.message}</p>

                                            <div className="mt-4 flex flex-wrap gap-2 relative z-10">
                                                {event.actor && (
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-foreground bg-muted px-3 py-1.5 rounded-xl border border-border/10 hover:border-border/40 transition-colors cursor-default">
                                                        <User className="w-3.5 h-3.5 opacity-40" />
                                                        {event.actor}
                                                    </div>
                                                )}
                                                {event.tags && event.tags.length > 0 && event.tags.map(tag => (
                                                    <div key={tag} className="text-[9px] font-black uppercase text-brand-blue bg-brand-blue/10 px-3 py-1.5 rounded-xl border border-brand-blue/30 hover:bg-brand-blue hover:text-white transition-all cursor-default">
                                                        #{tag}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    );
}
