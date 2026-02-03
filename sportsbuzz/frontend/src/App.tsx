import { Header } from "@/components/layout/Header"
import { useSportsStore } from "@/store/useSportsStore"
import { useMatches } from "@/hooks/useMatches"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Toaster } from "@/components/ui/sonner"
import { NewMatchBanner } from "@/components/matches/NewMatchBanner"

function App() {
  // Initialize WebSocket and data fetching
  useWebSocket()
  const { isLoading, error } = useMatches()

  const matches = useSportsStore((state) => state.matches)

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="neo-border bg-brand-yellow p-8 font-black text-3xl neo-shadow animate-bounce uppercase tracking-tighter">
        Loading Spotrz...
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="neo-border bg-red-400 p-8 font-black text-3xl neo-shadow uppercase tracking-tighter">
        Connection Error. Check API.
      </div>
    </div>
  )

  return (
    <div className="app-container gap-8">
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

        {/* Left Column: Matches */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="w-2 h-8 bg-brand-blue neo-border" />
              <h2 className="text-3xl font-black uppercase tracking-tighter">Current Matches</h2>
            </div>
            <div className="neo-border bg-black text-white px-3 py-1.5 font-black text-xs rounded uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(255,221,0,1)]">
              API: {Object.keys(matches).length}
            </div>
          </div>

          <NewMatchBanner />

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
