import { Header } from "@/components/layout/Header"
import { useSportsStore } from "@/store/useSportsStore"
import { useMatches } from "@/hooks/useMatches"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Toaster } from "@/components/ui/sonner"
import { NewMatchBanner } from "@/components/matches/NewMatchBanner"
import { motion, AnimatePresence } from "framer-motion"

import { MatchCard } from "@/components/matches/MatchCard"
import { CommentarySidebar } from "@/components/matches/CommentarySidebar"

function App() {
  // Initialize WebSocket and data fetching
  useWebSocket()
  const { isLoading, error } = useMatches()

  const matches = useSportsStore((state) => state.matches)

  // Sort matches: Live first, then by startTime
  const sortedMatches = Object.values(matches).sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (a.status !== 'live' && b.status === 'live') return 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="neo-border bg-brand-yellow p-8 font-black text-3xl neo-shadow animate-bounce uppercase tracking-tighter">
        Loading SportsBuzz...
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
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-8">

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

          {/* Match Grid */}
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12"
          >
            <AnimatePresence mode="popLayout">
              {sortedMatches.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="col-span-full border-4 border-dashed border-black/10 rounded-3xl py-20 flex flex-col items-center justify-center italic"
                >
                  <p className="font-bold text-xl uppercase">No matches found</p>
                </motion.div>
              ) : (
                sortedMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Right Column: Sidebar (Commentary) */}
        <aside className="hidden lg:block">
          <div className="neo-border bg-white rounded-3xl h-[calc(100vh-200px)] sticky top-8 flex flex-col overflow-hidden neo-shadow">
            <CommentarySidebar />
          </div>
        </aside>
      </main>

      <Toaster position="bottom-right" richColors closeButton visibleToasts={3} expand={false} />
    </div>
  )
}

export default App
