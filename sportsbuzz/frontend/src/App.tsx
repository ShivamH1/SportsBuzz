import { Header } from "@/components/layout/Header"
import { useSportsStore } from "@/store/useSportsStore"
import { useMatches } from "@/hooks/useMatches"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Toaster } from "@/components/ui/sonner"
import { NewMatchBanner } from "@/components/matches/NewMatchBanner"
import { motion, AnimatePresence } from "framer-motion"

import { MatchCard } from "@/components/matches/MatchCard"
import { CommentarySidebar } from "@/components/matches/CommentarySidebar"
import { ThemeProvider } from "@/context/ThemeContext"

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

function AppContent() {
  // Initialize WebSocket and data fetching
  useWebSocket()
  const { isLoading, error } = useMatches()

  const matches = useSportsStore((state) => state.matches)
  const activeMatchId = useSportsStore((state) => state.activeMatchId)

  // Sort matches: Live first, then by startTime
  const sortedMatches = Object.values(matches).sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (a.status !== 'live' && b.status === 'live') return 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="neo-border bg-brand-yellow p-8 font-black text-3xl neo-shadow animate-bounce uppercase tracking-tighter text-black">
        Loading SportsBuzz...
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="neo-border bg-red-400 p-8 font-black text-3xl neo-shadow uppercase tracking-tighter text-black">
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
              <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">Current Matches</h2>
            </div>
            <div className="neo-border bg-black text-brand-yellow px-3 py-1.5 font-black text-xs rounded uppercase tracking-widest neo-shadow-sm">
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
                  className="col-span-full border-4 border-dashed border-border/10 rounded-3xl py-20 flex flex-col items-center justify-center italic"
                >
                  <p className="font-bold text-xl uppercase text-foreground">No matches found</p>
                </motion.div>
              ) : (
                sortedMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Right Column: Sidebar (Commentary) - Desktop */}
        <aside className="hidden lg:block">
          <div className="neo-border bg-card rounded-3xl h-[calc(100vh-200px)] sticky top-8 flex flex-col overflow-hidden neo-shadow transition-colors duration-300">
            <CommentarySidebar />
          </div>
        </aside>
      </main>

      {/* Mobile Commentary Drawer */}
      <AnimatePresence>
        {matches[activeMatchId || 0] && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden h-[85vh] bg-card rounded-t-3xl neo-border border-b-0 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col"
          >
            {/* Handle Bar */}
            <div className="h-1.5 w-12 bg-foreground/10 rounded-full mx-auto my-3 flex-shrink-0" />

            <div className="flex-1 overflow-hidden">
              <CommentarySidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {matches[activeMatchId || 0] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => useSportsStore.getState().setActiveMatch(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" richColors closeButton visibleToasts={3} expand={false} />
    </div>
  )
}

export default App
