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

            <div className="relative z-10 flex flex-col items-center sm:items-start">
                <div className="flex items-center gap-2">
                    <h1 className="text-5xl font-black tracking-tighter uppercase leading-none drop-shadow-sm text-black">SportsBuzz</h1>
                    <div className="bg-black text-brand-yellow px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mt-1">v2.0</div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                    <p className="font-bold text-xs opacity-70 uppercase tracking-widest flex items-center gap-2 text-black">
                        <Activity className="w-3 h-3" />
                        Premium Sports Intelligence Hub
                    </p>
                    <ThemeToggle />
                </div>
            </div>

            <div className="flex items-center gap-4 mt-6 sm:mt-0 relative z-10">
                {/* Statistics */}
                <div className="flex flex-col items-end mr-2 hidden md:flex">
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
