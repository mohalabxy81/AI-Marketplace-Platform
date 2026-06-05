"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCreateListing } from "@/hooks/use-listings";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { ListingForm } from "@/features/listings";
import type { ListingFormValues } from "@/features/listings/components/listing-form";

export default function CreateListingPage() {
  const router = useRouter();
  const { mutateAsync: createListing, isPending } = useCreateListing();

  const handleSubmit = async (data: ListingFormValues) => {
    try {
      await createListing({
        ...data,
        description: data.description || null,
        location: data.location || null,
      });
      router.push("/listings");
    } catch (error) {
      console.error("Failed to create listing", error);
      alert("Failed to create listing. See console for details.");
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
            Back to listings
          </Button>
          <PageTitle>Create Listing</PageTitle>
          <PageDescription>
            Add a new product, service, or property to your catalog.
          </PageDescription>
        </div>
      </PageHeader>

      <PageContent>
        <ListingForm onSubmit={handleSubmit} isLoading={isPending} />
      </PageContent>
    </PageContainer>
  );
}
