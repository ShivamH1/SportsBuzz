import { useEffect, useCallback } from "react";
import { wsClient } from "@/lib/ws";
import { useSportsStore } from "@/store/useSportsStore";
import { toast } from "sonner";

export const useWebSocket = () => {
  const setWsConnected = useSportsStore((state) => state.setWsConnected);
  const addMatch = useSportsStore((state) => state.addMatch);
  const appendCommentary = useSportsStore((state) => state.appendCommentary);
  const incrementNewMatchesCount = useSportsStore(
    (state) => state.incrementNewMatchesCount,
  );

  const setupListeners = useCallback(() => {
    // Basic connection status from native lifecycle
    const unsubOpen = wsClient.on("open", () => {
      setWsConnected(true);
      toast.success("Live Feed Connected", {
        description: "You're now receiving real-time updates.",
      });
    });
    const unsubClose = wsClient.on("close", () => {
      setWsConnected(false);
      toast.warning("Live Feed Disconnected", {
        description: "Attempting to reconnect...",
      });
    });
    const unsubError = wsClient.on("error", (err: any) => {
      setWsConnected(false);
      // Only show error if it's not a standard close
      if (err) {
        toast.error(`WebSocket Error: ${err?.message || "Connection failed"}`);
      }
    });

    const unsubMatchCreated = wsClient.on("match_created", (msg) => {
      addMatch(msg.data);
      incrementNewMatchesCount();
      toast.info(`New Match: ${msg.data.homeTeam} vs ${msg.data.awayTeam}`);
    });

    const unsubCommentary = wsClient.on("commentary", (msg) => {
      appendCommentary(msg.data.matchId, msg.data);

      if (msg.data.eventType === "GOAL") {
        toast.success(`GOAL! ${msg.data.message}`);
      }
    });

    const unsubServerErrorMessage = wsClient.on("error", (msg) => {
      if (typeof msg === "object" && msg.type === "error") {
        toast.error(`Server Error: ${msg.message}`);
      }
    });

    const unsubMatchUpdated = wsClient.on("match_updated", (msg) => {
      useSportsStore.getState().updateMatch(msg.data.id, msg.data);
    });

    return () => {
      unsubOpen();
      unsubClose();
      unsubError();
      unsubMatchCreated();
      unsubMatchUpdated();
      unsubCommentary();
      unsubServerErrorMessage();
    };
  }, [setWsConnected, addMatch, incrementNewMatchesCount, appendCommentary]);

  useEffect(() => {
    wsClient.connect();
    const cleanup = setupListeners();

    return () => {
      cleanup();
      wsClient.disconnect();
      setWsConnected(false);
    };
  }, [setupListeners, setWsConnected]);
};
