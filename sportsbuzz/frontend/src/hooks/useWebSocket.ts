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
    const unsubOpen = wsClient.on("open", () => setWsConnected(true));
    const unsubClose = wsClient.on("close", () => setWsConnected(false));
    const unsubError = wsClient.on("error", (err: any) => {
      setWsConnected(false);
      toast.error(`WebSocket Error: ${err?.message || "Connection failed"}`);
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

    return () => {
      unsubOpen();
      unsubClose();
      unsubError();
      unsubMatchCreated();
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
