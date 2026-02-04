import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSportsStore } from "@/store/useSportsStore";
import type { CommentaryEvent, ApiResponse } from "@/types/sports";

export const useCommentary = (matchId: number | null) => {
  const setCommentary = useSportsStore((state) => state.setCommentary);

  return useQuery({
    queryKey: ["commentary", matchId],
    queryFn: async () => {
      if (!matchId) return [];

      const response = await api.get<ApiResponse<CommentaryEvent[]>>(
        `/matches/${matchId}/commentary`,
      );
      const events = response.data.data;

      setCommentary(matchId, events);
      return events;
    },
    enabled: !!matchId,
    staleTime: 1000 * 60, // 1 minute
  });
};
