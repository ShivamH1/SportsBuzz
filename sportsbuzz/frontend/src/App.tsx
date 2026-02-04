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

        {/* Right Column: Sidebar (Commentary) */}
        <aside className="hidden lg:block">
          <div className="neo-border bg-card rounded-3xl h-[calc(100vh-200px)] sticky top-8 flex flex-col overflow-hidden neo-shadow transition-colors duration-300">
            <CommentarySidebar />
          </div>
        </aside>
      </main>

      <Toaster position="bottom-right" richColors closeButton visibleToasts={3} expand={false} />
    </div>
  )
}

export default App
