import { useSportsStore } from "@/store/useSportsStore";
import { cn } from "@/lib/utils";
import { Activity, Radio } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
    const wsConnected = useSportsStore((state) => state.wsConnected);
    const matches = useSportsStore((state) => state.matches);
    const apiCount = Object.keys(matches).length;

    return (
        <header className="neo-border bg-brand-yellow p-6 flex flex-col sm:flex-row items-center justify-between rounded-3xl relative overflow-hidden group transition-all duration-500 hover:neo-shadow-lg">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left">
                <div className="relative group/logo">
                    <img
                        src="/logo.svg"
                        alt="SportsBuzz Logo"
                        className="w-16 h-16 sm:w-20 sm:h-20 transition-all duration-500 transform group-hover/logo:scale-110 drop-shadow-md"
                    />
                </div>

                <div className="flex flex-col items-center sm:items-start">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-none flex items-center select-none whitespace-nowrap">
                            <span className="text-black">Sports</span>
                            <span className="text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] ml-1 relative -top-[1.5px]">Buzz</span>
                        </h1>
                        <div className="bg-black text-brand-yellow px-1.5 py-0.5 sm:px-2 sm:py-1.5 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-widest neo-shadow-sm self-center">v1.0</div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 mt-1 sm:mt-1">
                        <p className="font-extrabold text-[8px] sm:text-[11px] text-black uppercase tracking-[0.3em] sm:tracking-[0.4em] flex items-center gap-1.5 sm:gap-2">
                            <Activity className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                            Live Sports Intelligence
                        </p>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mt-6 sm:mt-0 relative z-10">
                {/* Statistics */}
                <div className="flex flex-col items-end mr-2 hidden md:flex text-black">
                    <span className="text-[10px] font-black uppercase opacity-40 leading-none">Global Feed</span>
                    <span className="text-xl font-black leading-none">{apiCount} Matches</span>
                </div>

                {/* Connection Status Badge */}
                <div className={cn(
                    "neo-border bg-card px-5 py-3 flex items-center gap-3 rounded-2xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_var(--border)] transition-all group-hover:shadow-[2px_2px_0px_0px_var(--border)] group-hover:translate-x-0.5 group-hover:translate-y-0.5",
                    wsConnected ? "text-foreground" : "text-foreground/40"
                )}>
                    <div className="relative flex items-center justify-center">
                        <div className={cn(
                            "w-4 h-4 rounded-full border-2 border-border relative z-10 transition-colors duration-500",
                            wsConnected ? "bg-brand-green" : "bg-red-500"
                        )} />
                        {wsConnected && (
                            <div className="absolute w-6 h-6 bg-brand-green/40 rounded-full animate-ping" />
                        )}
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] opacity-40">Status</span>
                        <span className="tracking-tight">{wsConnected ? 'Live Feed' : 'Offline'}</span>
                    </div>
                    {wsConnected && <Radio className="w-4 h-4 animate-pulse opacity-50" />}
                </div>
            </div>
        </header>
    );
}
