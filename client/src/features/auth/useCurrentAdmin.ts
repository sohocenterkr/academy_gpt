import { useQuery } from "@tanstack/react-query";
import { getCurrentAdmin } from "./api";

export const currentAdminQueryKey = ["currentAdmin"] as const;

export function useCurrentAdmin() {
  return useQuery({
    queryKey: currentAdminQueryKey,
    queryFn: getCurrentAdmin,
    retry: false,
    staleTime: 60_000
  });
}
