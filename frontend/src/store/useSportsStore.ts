import { create } from "zustand";
import type { Match, CommentaryEvent } from "@/types/sports";

interface SportsState {
  // Connection & Notifications
  wsConnected: boolean;
  newMatchesCount: number;
  lastMatchListFetch: Date | null;

  // Data
  matches: Record<number, Match>;
  commentaryByMatchId: Record<number, CommentaryEvent[]>;
  activeMatchId: number | null;

  // Actions
  setWsConnected: (connected: boolean) => void;
  incrementNewMatchesCount: () => void;
  dismissNewMatchesBanner: () => void;
  setLastMatchListFetch: (date: Date) => void;

  setMatches: (matches: Record<number, Match>) => void;
  addMatch: (match: Match) => void;
  updateMatch: (id: number, updates: Partial<Match>) => void;

  setCommentary: (matchId: number, events: CommentaryEvent[]) => void;
  appendCommentary: (matchId: number, event: CommentaryEvent) => void;
  setActiveMatch: (id: number | null) => void;
}

export const useSportsStore = create<SportsState>((set) => ({
  wsConnected: false,
  newMatchesCount: 0,
  lastMatchListFetch: null,
  matches: {},
  commentaryByMatchId: {},
  activeMatchId: null,

  setWsConnected: (connected) => set({ wsConnected: connected }),

  incrementNewMatchesCount: () =>
    set((state) => ({ newMatchesCount: state.newMatchesCount + 1 })),

  dismissNewMatchesBanner: () => set({ newMatchesCount: 0 }),

  setLastMatchListFetch: (date) => set({ lastMatchListFetch: date }),

  setMatches: (matches) => set({ matches }),

  addMatch: (match) =>
    set((state) => ({
      matches: { ...state.matches, [match.id]: match },
    })),

  updateMatch: (id, updates) =>
    set((state) => ({
      matches: {
        ...state.matches,
        [id]: state.matches[id]
          ? { ...state.matches[id], ...updates }
          : state.matches[id],
      },
    })),

  setCommentary: (matchId, events) =>
    set((state) => ({
      commentaryByMatchId: {
        ...state.commentaryByMatchId,
        [matchId]: events,
      },
    })),

  appendCommentary: (matchId, event) =>
    set((state) => ({
      commentaryByMatchId: {
        ...state.commentaryByMatchId,
        [matchId]: [event, ...(state.commentaryByMatchId[matchId] || [])],
      },
    })),

  setActiveMatch: (id) => set({ activeMatchId: id }),
}));
