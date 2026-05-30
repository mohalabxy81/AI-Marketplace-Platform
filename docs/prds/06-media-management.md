# PRD 6 — MEDIA MANAGEMENT

> **Status**: Approved
> **Target Audience**: Engineering, Product, UI/UX
> **Domain**: Marketplace (Media Sub-Domain)

## 1. Executive Summary
The Media Management domain handles the ingestion, processing, storage, and delivery of all multimedia assets attached to marketplace listings and user profiles. Because marketplace discovery relies heavily on visual appeal, this system must process high-resolution images rapidly, create optimized variants (thumbnails, responsive sizes), and deliver them globally with sub-100ms latency via a CDN. 

## 2. Business Objectives
- **Visual Excellence**: Support high-quality image uploads without degrading client-side load times.
- **Cost Efficiency**: Optimize storage and egress costs through aggressive WebP compression and aggressive caching.
- **Platform Safety**: Integrate tightly with Trust & Safety pipelines to prevent the hosting of prohibited or malicious media.

## 3. Strategic Goals
- Ensure 95% of images are served under 100ms globally via CDN.
- Achieve 100% automated virus and toxicity scanning on all uploaded media before it becomes publicly accessible.
- Support up to 10MB per image upload with transparent background resizing.

## 4. User Personas
- **Seller**: Uploads galleries of images (and later, videos/documents) to listings.
- **Buyer**: Consumes optimized media rapidly on various devices (mobile, desktop).
- **System Administrator**: Monitors CDN bandwidth, storage costs, and caching hit rates.

## 5. Stakeholders
- **Trust & Safety Team**: Relies on image moderation pipelines.
- **Frontend Team**: Relies on predictable, structured URLs for responsive image sets (e.g., `src-set`).
- **DevOps/SRE**: Manages S3 buckets and CloudFront/Cloudflare CDN configurations.

## 6. User Stories
- As a **Seller**, I want to drag and drop 10 photos at once and see a progress bar so I don't have to upload them one by one.
- As a **Seller**, I want to drag to reorder my images so I can pick the most attractive one as the primary thumbnail.
- As a **Buyer on Mobile**, I want images to load instantly and not drain my data plan, so I expect them to be optimized.
- As a **Trust Moderator**, I want automated detection of inappropriate images so they never appear on the live site.

## 7. Functional Requirements
- **FR-MED-01 (Uploads)**: Support direct-to-S3 signed URL uploads to bypass backend bottlenecks.
- **FR-MED-02 (Formats)**: Accept JPEG, PNG, GIF, WebP. Convert all to WebP for final delivery.
- **FR-MED-03 (Transformations)**: Automatically generate variants: Thumbnail (200x200), Medium (800x600), Large (1920x1080).
- **FR-MED-04 (Ordering)**: Support an `order_index` integer on images to allow drag-and-drop gallery sorting.
- **FR-MED-05 (Documents)**: Support PDF uploads (max 50MB) for listing attachments (V1).

## 8. Non-Functional Requirements
- **Delivery**: All public media must be served behind a CDN.
- **Security**: Uploaded files must not have executable permissions. SVG files must be aggressively sanitized to prevent XSS.
- **Resilience**: Asynchronous image processing (resizing) must gracefully retry on failure without blocking the user's workflow.

## 9. User Workflows
- **Upload Flow**: Client requests Signed URL → Server validates quota/auth and returns URL → Client PUTs directly to S3 → Client notifies server of completion → Background worker resizes image and marks as READY → Image is available via CDN.
- **Gallery Management**: User drags image #3 to position #1 → Client sends PATCH request with new order array → DB updates `order_index` → Primary thumbnail changes instantly.

## 10. State Machines
- **Media Status**: `UPLOADING` → `PROCESSING` → `READY` (or `QUARANTINED` / `FAILED`).

## 11. Business Rules
- A listing must have exactly one "Primary" image (order_index = 0).
- If an image fails the moderation scan, it is immediately deleted from public buckets and marked `QUARANTINED` in the DB.
- Tenants are limited by their storage quota (e.g., Starter plan = 5GB total media).

## 12. Permissions
- `listings:media:write` - Upload/delete media attached to owned listings.
- `profile:media:write` - Upload avatar image.
- `admin:media:delete` - (Super Admin) Force delete any media asset.

## 13. Events Generated
- `media.uploaded`
- `media.processing_completed`
- `media.processing_failed`
- `media.quarantined`

## 14. Events Consumed
- `trust.image_scanned` (Moderation result from AI).

## 15. Analytics Requirements
- CDN bandwidth and Cache Hit Ratio.
- Storage volume growth per tenant.
- Upload failure rates (client-side vs processing side).

## 16. KPIs
- Cache Hit Ratio (>95%).
- Median Media Load Time.
- S3 Storage Costs.

## 17. Success Metrics
- Zero XSS vulnerabilities triggered by malicious file uploads.
- Image processing pipeline maintains < 2s P95 duration from S3 put to thumbnail ready.

## 18. Edge Cases
- **EXIF Data**: EXIF data (including GPS coordinates) must be stripped during processing to protect user privacy, unless explicitly required by a specific vertical (e.g., real estate geo-tagging).
- **Color Profiles**: CMYK images must be converted to sRGB during processing to render correctly in browsers.

## 19. Failure Scenarios
- **CDN Outage**: Implement failover directly to the S3 bucket URL with degraded caching, ensuring availability remains during a regional CDN event.
- **Processing Worker Crash**: Background job must be idempotent and retried by the queue manager.

## 20. Compliance Requirements
- **Data Deletion**: When a listing is hard-deleted, all associated S3 objects must be permanently deleted to comply with GDPR data minimization.

## 21. Realtime Requirements
- Client-side progress bars for direct-to-S3 uploads. WebSocket push when background processing is complete.

## 22. AI Requirements
- AI-based image cropping (identifying the focal point of the image to ensure thumbnails aren't cropped awkwardly).
- AI moderation for nudity, violence, and prohibited content via AWS Rekognition or GPT-4o-Vision.

## 23. MVP Scope
- Direct-to-S3 signed URL uploads.
- Automatic resizing (Thumbnail/Large).
- Basic format validation (JPEG/PNG/WebP).
- Max 6 images per listing (1 primary, 5 gallery).

## 24. V1 Scope
- Document (PDF) uploads.
- EXIF data stripping.
- AI Image Moderation pipeline.

## 25. V2 Scope
- AI Smart Cropping.
- Video uploads (muxing/HLS streaming).

## 26. Future Enhancements
- 3D/AR model hosting for immersive listings.
- Automated watermarking (tenant logos on images).

## 27. Acceptance Criteria
- [ ] User can securely upload an image via signed URL.
- [ ] Uploaded image is asynchronously resized into two variants (Thumbnail, Full).
- [ ] Image metadata (EXIF) is stripped.
- [ ] Image URL is served via CDN and resolves successfully.
- [ ] Drag-and-drop reordering correctly updates the primary thumbnail.
