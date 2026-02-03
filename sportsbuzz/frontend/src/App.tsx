import { Activity, Clock, Bell, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { useSportsStore } from "@/store/useSportsStore"
import { useMatches } from "@/hooks/useMatches"
import { useWebSocket } from "@/hooks/useWebSocket"
import { cn } from "@/lib/utils"

function App() {
  // Initialize WebSocket and initial data fetching
  useWebSocket()
  const { isLoading, error } = useMatches()

  const matches = useSportsStore((state) => state.matches)
  const wsConnected = useSportsStore((state) => state.wsConnected)
  const updateMatch = useSportsStore((state) => state.updateMatch)
  const newMatchesCount = useSportsStore((state) => state.newMatchesCount)
  const dismissNewMatchesBanner = useSportsStore((state) => state.dismissNewMatchesBanner)

  const simulateUpdate = () => {
    // Just for UI testing while backend is local
    updateMatch(1, { homeScore: 3 })
    toast.success("Goal! Lions FC scores!", {
      description: "Match: Lions FC vs Tigers United",
      icon: <Bell className="h-4 w-4" />,
    })
  }

  if (isLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading SportsBuzz...</div>
  if (error) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-500">Failed to load matches.</div>

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SportsBuzz Live</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "flex items-center gap-1.6 text-xs font-medium px-2 py-0.5 rounded-full",
                wsConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              )}>
                {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {wsConnected ? 'Live Connection Active' : 'Disconnected'}
              </span>
              <p className="text-zinc-400 text-sm">Real-time match updates</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {newMatchesCount > 0 && (
              <Button variant="secondary" size="sm" onClick={dismissNewMatchesBanner}>
                {newMatchesCount} New Matches
              </Button>
            )}
            <Button variant="outline" onClick={simulateUpdate}>
              Simulate Update
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {Object.values(matches).length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
              No matches found.
            </div>
          ) : (
            Object.values(matches).map((match) => (
              <Card key={match.id} className="bg-zinc-900 border-zinc-800 text-zinc-50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Badge variant={match.status === 'live' ? 'destructive' : 'secondary'} className={match.status === 'live' ? 'animate-pulse' : ''}>
                    {match.status.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-zinc-400">
                    <Clock className="h-4 w-4" />
                    {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-xl font-semibold">
                    <span>{match.homeTeam}</span>
                    <span className="text-3xl font-bold bg-zinc-800 px-3 py-1 rounded">
                      {match.homeScore} : {match.awayScore}
                    </span>
                    <span>{match.awayTeam}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <header className="px-6 py-4 border-b border-zinc-800">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-emerald-500" />
              Live Commentary
            </CardTitle>
          </header>
          <CardContent className="pt-6">
            <ScrollArea className="h-[200px] w-full rounded-md border border-zinc-800 p-4">
              <div className="space-y-4">
                <p className="text-sm text-zinc-500 italic">Select a match to view live commentary events.</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  )
}

export default App
