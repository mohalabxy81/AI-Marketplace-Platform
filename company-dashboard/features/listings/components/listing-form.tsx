"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Wand2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader } from "./image-uploader";
import { usePermissions } from "@/hooks/use-permissions";
import type { DbListing } from "@/types/database";

const listingSchema = z.object({
  title: z.string().min(3, "Title is too short").max(100, "Title is too long"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  category: z.string().min(1, "Category is required"),
  type: z.enum(["real_estate", "cars", "products", "services"]),
  status: z.enum(["draft", "published", "archived", "pending_review"]),
  location: z.string().optional(),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export type ListingFormValues = z.infer<typeof listingSchema>;

interface ListingFormProps {
  initialData?: DbListing;
  onSubmit: (data: ListingFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ListingForm({ initialData, onSubmit, isLoading }: ListingFormProps) {
  const { can } = usePermissions();
  const canPublish = can("publish_listings");

  const defaultFormValues: ListingFormValues = initialData
    ? {
        title: initialData.title,
        description: initialData.description || "",
        price: initialData.price,
        category: initialData.category,
        type: initialData.type,
        status: initialData.status,
        location: initialData.location || "",
        images: initialData.images || [],
        tags: initialData.tags || [],
      }
    : {
        title: "",
        description: "",
        price: 0,
        category: "",
        type: "products",
        // Agents default to draft and cannot elevate status themselves
        status: canPublish ? "draft" : "draft",
        location: "",
        images: [],
        tags: [],
      };

  const form = useForm({
    resolver: zodResolver(listingSchema),
    defaultValues: defaultFormValues,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  // eslint-disable-next-line react-hooks/incompatible-library
  const images = watch("images");

  const handleFormSubmit = (data: ListingFormValues) => {
    return onSubmit(data);
  };

  const handleAiTitleSuggest = () => {
    // AI integration placeholder — will call /api/ai/suggest-title
    console.log("[AI] Title suggestion requested");
  };

  const handleAiSeoSuggest = () => {
    // AI integration placeholder — will call /api/ai/suggest-seo
    console.log("[AI] SEO suggestion requested");
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left Column: Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Title + AI Suggestion */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  Basic Information
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAiTitleSuggest}
                  leftIcon={<Wand2 className="h-3 w-3" aria-hidden="true" />}
                  className="h-7 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                  title="AI will suggest an optimized title"
                  aria-label="Suggest optimized title using AI"
                >
                  AI Title
                </Button>
              </div>

              <Input
                id="title-input"
                label="Title"
                {...register("title")}
                error={errors.title?.message}
                placeholder="e.g. Modern Concrete Desk"
                aria-label="Listing Title"
                aria-invalid={!!errors.title}
              />

              {/* Description + AI SEO Suggest */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--color-text)]">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={handleAiSeoSuggest}
                    title="AI will generate an SEO-optimized description"
                    aria-label="Generate SEO optimized description using AI"
                    className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    AI SEO
                  </button>
                </div>
                <textarea
                  id="description-input"
                  {...register("description")}
                  className="flex min-h-[120px] w-full rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  placeholder="Describe your listing..."
                  aria-label="Listing Description"
                  aria-invalid={!!errors.description}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Media
              </h3>
              <ImageUploader
                value={images || []}
                onChange={(urls) => setValue("images", urls)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Settings
              </h3>

              <Input
                id="price-input"
                type="number"
                label="Price"
                {...register("price")}
                error={errors.price?.message}
                aria-label="Listing Price"
                aria-invalid={!!errors.price}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Type
                </label>
                <select
                  id="type-select"
                  {...register("type")}
                  aria-label="Listing Type"
                  className="flex h-10 w-full rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] text-[var(--color-text)]"
                >
                  <option value="products">Product</option>
                  <option value="services">Service</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="cars">Car</option>
                </select>
              </div>

              {/* RBAC: Status field — agents are locked to draft/pending_review */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Status
                </label>
                <select
                  id="status-select"
                  {...register("status")}
                  disabled={!canPublish && !!initialData?.status && initialData.status === "published"}
                  aria-label="Listing Status"
                  aria-describedby="status-help"
                  className="flex h-10 w-full rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  {/* Only owners/managers can publish or archive */}
                  {canPublish && (
                    <>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </>
                  )}
                </select>
                {!canPublish && (
                  <p id="status-help" className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                    <span>ℹ</span>
                    Submit for review — a manager will approve publication.
                  </p>
                )}
              </div>

              <Input
                id="category-input"
                label="Category"
                {...register("category")}
                error={errors.category?.message}
                placeholder="e.g. Furniture"
                aria-label="Listing Category"
                aria-invalid={!!errors.category}
              />

              <Input
                id="location-input"
                label="Location (Optional)"
                {...register("location")}
                placeholder="e.g. New York, NY"
                aria-label="Listing Location"
              />
            </CardContent>
          </Card>

          {/* AI Insights placeholder card */}
          <Card className="border border-dashed border-[var(--color-accent)]/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                <h4 className="text-sm font-semibold text-[var(--color-text)]">
                  AI Suggestions
                </h4>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Connect your AI engine to get real-time title, SEO, and pricing
                recommendations as you type.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAiTitleSuggest}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
                >
                  Suggest Title
                </button>
                <button
                  type="button"
                  onClick={handleAiSeoSuggest}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
                >
                  SEO Optimize
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-6">
        <Button type="button" variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? "Save Changes" : "Create Listing"}
        </Button>
      </div>
    </form>
  );
}
