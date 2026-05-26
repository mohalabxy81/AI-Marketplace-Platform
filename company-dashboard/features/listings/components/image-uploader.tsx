"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({ value, onChange, maxImages = 10 }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        alert(`You can only upload up to ${maxImages} images.`);
        return;
      }

      setIsUploading(true);
      try {
        // Mock upload logic for now. 
        // In reality, this would use Supabase Storage to upload the file
        // and return the public URL.
        const newUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
        
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        onChange([...value, ...newUrls]);
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsUploading(false);
      }
    },
    [value, onChange, maxImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxSize: 5242880, // 5MB
  });

  const removeImage = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        role="button"
        aria-label="Upload images dropzone"
        className={cn(
          "flex flex-col items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--color-border)] p-8 transition-colors cursor-pointer outline-none hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-alt)]",
          isDragActive && "border-[var(--color-accent)] bg-[var(--color-surface-alt)]",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} aria-label="Upload images input" />
        <UploadCloud className="h-8 w-8 text-[var(--color-text-muted)] mb-3" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Click or drag images here to upload
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            PNG, JPG, WEBP up to 5MB (max {maxImages} images)
          </p>
        </div>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] border border-[var(--color-border)]"
            >
              <Image
                src={url}
                alt={`Upload ${index + 1}`}
                fill
                unoptimized
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                aria-label={`Remove image ${index + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity focus:opacity-100 hover:bg-black group-hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          {isUploading && (
            <div className="flex aspect-square items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse">
              <FileImage className="h-6 w-6 text-[var(--color-text-muted)]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
