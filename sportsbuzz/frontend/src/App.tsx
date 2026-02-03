import { Button } from "@/components/ui/button"
import { useSportsStore } from "@/store/useSportsStore"
import { useMatches } from "@/hooks/useMatches"
import { useWebSocket } from "@/hooks/useWebSocket"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

function App() {
  // Initialize WebSocket and data fetching
  useWebSocket()
  const { isLoading, error } = useMatches()

  const wsConnected = useSportsStore((state) => state.wsConnected)
  const newMatchesCount = useSportsStore((state) => state.newMatchesCount)
  const dismissNewMatchesBanner = useSportsStore((state) => state.dismissNewMatchesBanner)

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="neo-border bg-brand-yellow p-6 font-bold text-2xl animate-bounce">
        LOADING SPOTRZ...
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="neo-border bg-red-400 p-6 font-bold text-2xl">
        FAILED TO LOAD MATCHES. CHECK API.
      </div>
    </div>
  )

  return (
    <div className="app-container gap-6">
      {/* Header Bar */}
      <header className="neo-border bg-brand-yellow p-6 flex items-center justify-between rounded-xl relative overflow-hidden">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Spotrz</h1>
          <p className="font-bold text-sm opacity-80">Real-time match data demo</p>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "neo-border bg-white px-4 py-2 flex items-center gap-2 rounded-full font-bold text-xs uppercase transition-colors",
            wsConnected ? "text-emerald-600" : "text-red-500"
          )}>
            <div className={cn("w-3 h-3 rounded-full border-2 border-black", wsConnected ? "bg-emerald-500" : "bg-red-500")} />
            {wsConnected ? 'Live Connected' : 'Disconnected'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

        {/* Left Column: Matches */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-brand-blue neo-border" />
              <h2 className="text-2xl font-black uppercase tracking-tight">Current Matches</h2>
            </div>
            <div className="neo-border bg-black text-white px-3 py-1 font-bold text-xs rounded">
              API: 11
            </div>
          </div>

          {/* New Match Banner */}
          {newMatchesCount > 0 && (
            <div className="neo-border bg-brand-yellow p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
              <p className="font-bold">{newMatchesCount} new matches added</p>
              <Button
                variant="ghost"
                size="sm"
                className="neo-border bg-white hover:bg-zinc-100 rounded-lg h-8 px-4 font-black text-xs uppercase"
                onClick={dismissNewMatchesBanner}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Match Grid will go here */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Placeholder for Match Cards */}
            <div className="col-span-full border-4 border-dashed border-black/10 rounded-3xl py-20 flex flex-col items-center justify-center opacity-50 italic">
              <p className="font-bold text-xl">Match Grid Implementation Task Pending...</p>
            </div>
          </div>
        </section>

        {/* Right Column: Sidebar (Commentary) */}
        <aside className="hidden lg:block">
          <div className="neo-border bg-white rounded-3xl h-[calc(100vh-280px)] sticky top-8 flex flex-col overflow-hidden">
            {/* Sidebar content will go here */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-40">
              <div className="w-16 h-16 rounded-full bg-brand-yellow neo-border flex items-center justify-center">
                {/* Video Icon placeholder */}
                <div className="w-8 h-5 neo-border bg-white rounded-sm" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase">No Match Selected</h3>
                <p className="font-medium text-sm mt-2">
                  Select a match from the list to view live commentary and real-time updates.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  )
}

export default App
