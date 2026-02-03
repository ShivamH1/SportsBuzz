import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSportsStore } from "@/store/useSportsStore";
import type { Match, ApiResponse } from "@/types/sports";

export const useMatches = () => {
  const setMatches = useSportsStore((state) => state.setMatches);
  const setLastFetch = useSportsStore((state) => state.setLastMatchListFetch);

  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Match[]>>("/matches");
      const matchesArray = response.data.data;

      // Convert array to Record for the store
      const matchRecord = matchesArray.reduce(
        (acc, match) => {
          acc[match.id] = match;
          return acc;
        },
        {} as Record<number, Match>,
      );

      setMatches(matchRecord);
      setLastFetch(new Date());

      return matchesArray;
    },
    // We keep it fresh for a while because standard updates come through WS
    staleTime: 1000 * 60 * 5,
  });
};
