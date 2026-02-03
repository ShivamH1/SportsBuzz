import { useSportsStore } from "@/store/useSportsStore";
import { cn } from "@/lib/utils";

export function Header() {
    const wsConnected = useSportsStore((state) => state.wsConnected);
    const matches = useSportsStore((state) => state.matches);
    const apiCount = Object.keys(matches).length;

    return (
        <header className="neo-border bg-brand-yellow p-6 flex items-center justify-between rounded-2xl relative overflow-hidden transition-all duration-300">
            <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Spotrz</h1>
                <p className="font-bold text-sm mt-1 opacity-80 uppercase tracking-tight">Real-time match data demo</p>
            </div>

            <div className="flex items-center gap-4">
                {/* API Count Badge - Small but bold */}
                <div className="neo-border bg-black text-white px-3 py-1 font-black text-xs rounded uppercase hidden sm:block">
                    API: {apiCount}
                </div>

                {/* Connection Status Badge */}
                <div className={cn(
                    "neo-border bg-white px-4 py-2 flex items-center gap-2 rounded-full font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                    wsConnected ? "text-emerald-600" : "text-red-500"
                )}>
                    <div className={cn(
                        "w-3 h-3 rounded-full border-2 border-black",
                        wsConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                    )} />
                    {wsConnected ? 'Live Connected' : 'Disconnected'}
                </div>
            </div>
        </header>
    );
}
