# 6. STORAGE ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Backend Engineers, Platform Engineers
> **Domain**: Media & Assets

## 1. Executive Summary
The Storage Architecture leverages Supabase Storage (backed by S3) to handle all media assets, documents, and data exports. Security relies on Postgres RLS policies mapped to the `storage.objects` table, enforcing the same multi-tenant boundaries as the relational database.

## 2. Storage Buckets Design

### `listing-media`
- **Purpose**: High-resolution images and videos attached to marketplace listings.
- **Ownership**: `marketplace` domain.
- **Access Rules**: 
  - `SELECT`: Public (if listing is published).
  - `INSERT/UPDATE/DELETE`: Authenticated tenant members only (via RLS).
- **Lifecycle Policy**: Soft-deleted files moved to a hidden state for 30 days, then hard-deleted.
- **Size Strategy**: Max 10MB per image, 50MB per video. Image resizing applied via Supabase Image Transformations on CDN request.

### `company-assets`
- **Purpose**: Logos, brand guidelines, and public-facing corporate documents.
- **Ownership**: `tenant` domain.
- **Access Rules**: Public read, restricted tenant write.
- **Lifecycle Policy**: Permanent retention while tenant is active.

### `avatars`
- **Purpose**: User profile pictures.
- **Ownership**: `identity` domain.
- **Access Rules**: Public read, user-restricted write.
- **Size Strategy**: Max 2MB, cropped to 1:1 aspect ratio via client before upload.

### `verification-documents`
- **Purpose**: Sensitive documents (IDs, tax forms, business licenses) required for Trust & Safety verification.
- **Ownership**: `trust` domain.
- **Access Rules**: Strictly private. Readable ONLY by `SUPER_ADMIN` or `PLATFORM_ADMIN`. Not even the uploading tenant can read it back.
- **Lifecycle Policy**: Hard deleted 90 days after verification decision is reached (compliance requirement).

### `moderation-assets`
- **Purpose**: Screenshots of flagged content or evidence provided during dispute appeals.
- **Ownership**: `trust` domain.
- **Access Rules**: Private. Accessible to assigned moderators.
- **Lifecycle Policy**: Retained indefinitely for legal audit trails.

### `campaign-assets`
- **Purpose**: Ad creatives for sponsored listings or banners.
- **Ownership**: `billing` domain.
- **Access Rules**: Public read, tenant write.
- **Size Strategy**: Max 5MB.

### `ai-assets`
- **Purpose**: Binary data generated or required by AI pipelines (e.g., fine-tuning datasets, heavy prompt context files).
- **Ownership**: `ai_ops` domain.
- **Access Rules**: Private. Accessible only via `service_role` (Edge Functions).
- **Lifecycle Policy**: Ephemeral. Deleted automatically after 7 days to manage costs.

### `exports`
- **Purpose**: Asynchronous CSV/JSON data dumps (GDPR portability requests, Analytics reports).
- **Ownership**: `governance` domain.
- **Access Rules**: Private. Only accessible via cryptographically signed presigned URLs with short expiry (e.g., 60 minutes).
- **Lifecycle Policy**: Hard deleted after 24 hours.

## 3. Upload Workflows
1. **Direct-to-Cloud Upload**: The Next.js client requests a signed upload URL from Supabase for a specific bucket/path.
2. **Client Upload**: The browser uploads the binary payload directly to Supabase Storage, bypassing Vercel/Node limits.
3. **Database Sync**: The client receives the storage path, then POSTs the path to the marketplace API to link the file to the listing record.

## 4. File Path Convention
All tenant-owned files MUST follow this path structure to enable efficient RLS rules:
`[bucket_name]/[tenant_id]/[entity_id]/[file_name]`
Example: `listing-media/uuid-tenant-1/uuid-listing-5/hero-image.jpg`

## 5. Security (Storage RLS)
Storage RLS intercepts `storage.objects`.
```sql
CREATE POLICY "Tenants can upload media" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-media' AND
  (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'active_tenant_id')
);
```
