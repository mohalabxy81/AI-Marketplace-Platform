"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useListing, useUpdateListing } from "@/hooks/use-listings";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { ListingForm } from "@/features/listings/components/listing-form";
import type { ListingFormValues } from "@/features/listings/components/listing-form";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Next 15 specific: unwrap params using React.use()
  const { id } = use(params);
  
  const { data: listing, isLoading, error } = useListing(id);
  const { mutateAsync: updateListing, isPending } = useUpdateListing();

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-[var(--color-error)]">Failed to load listing.</p>
      </div>
    );
  }

  if (isLoading || !listing) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <span className="text-[var(--color-text-muted)] animate-pulse">Loading...</span>
      </div>
    );
  }

  const handleSubmit = async (data: ListingFormValues) => {
    try {
      await updateListing({ 
        id, 
        data: {
          ...data,
          description: data.description || null,
          location: data.location || null,
        }
      });
      router.push("/listings");
    } catch (error) {
      console.error("Failed to update listing", error);
      alert("Failed to update listing.");
    }
  };

  return (
    <PageContainer>
      <PageHeader className="mb-6">
        <div className="flex flex-col gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-fit -ml-2 text-[var(--color-text-muted)]" 
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <PageTitle>Edit Listing</PageTitle>
          <PageDescription>
            Update information for &quot;{listing.title}&quot;
          </PageDescription>
        </div>
      </PageHeader>

      <PageContent>
        <ListingForm 
          initialData={listing} 
          onSubmit={handleSubmit} 
          isLoading={isPending} 
        />
      </PageContent>
    </PageContainer>
  );
}
