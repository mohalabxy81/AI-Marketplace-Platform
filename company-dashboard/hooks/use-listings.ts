import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getListings, 
  getListingById, 
  createListing, 
  updateListing, 
  deleteListing 
} from "@/services/listings/listings.service";
import type { InsertListing, UpdateListing } from "@/types/database";

// Hooks

export function useListings() {
  return useQuery({
    queryKey: ["listings"],
    queryFn: () => getListings(),
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ["listings", id],
    queryFn: () => getListingById(id),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InsertListing, "company_id" | "created_by">) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListing }) => updateListing(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings", id] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
