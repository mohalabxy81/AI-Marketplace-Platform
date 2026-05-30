# 15. BACKUP & DISASTER RECOVERY

> **Status**: Approved
> **Target Audience**: SREs, Database Administrators
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Resilience Philosophy

The platform architecture assumes that individual hardware components will fail. As an enterprise multi-tenant system, data loss is a catastrophic event that breaks trust with thousands of businesses simultaneously.

We employ a **Defense-in-Depth** backup strategy utilizing Supabase's native tools augmented with external archiving.

---

## 2. Point-in-Time Recovery (PITR)

### 2.1 WAL Archiving
Supabase Enterprise enables **Point-in-Time Recovery (PITR)**. 
- The Postgres Write-Ahead Log (WAL) is continuously archived to physical cloud storage (AWS S3) every 2 minutes.
- **RPO (Recovery Point Objective)**: Maximum 2 minutes of data loss.
- **Retention**: WAL archives are retained for 7 days.

### 2.2 PITR Execution
If a catastrophic developer error occurs (e.g., an errant `DELETE FROM marketplace.listings` bypassing RLS), a Super Admin can restore the entire database to the exact millisecond before the destructive query executed.

---

## 3. Logical Backups (pg_dump)

PITR restores the *entire* database. However, multi-tenant architectures often require **Tenant-Level Restoration** (e.g., restoring just Tenant A's data after they accidentally deleted their own categories).

### 3.1 Daily Snapshot Routine
1. A cron job executes `pg_dump` daily at 02:00 UTC.
2. The dump is compressed and encrypted (AES-256).
3. The encrypted archive is pushed to a secondary, physically isolated cloud region (e.g., from AWS `us-east-1` to AWS `us-west-2`).
4. **Retention**: Daily snapshots are retained for 30 days. Weekly snapshots for 1 year.

### 3.2 Tenant-Level Extraction
Because all tables strictly use the `tenant_id` column, SREs can write a script to extract a single tenant's data from a logical backup file and replay it into the live database.

---

## 4. Disaster Recovery & High Availability

### 4.1 Primary/Replica Architecture
In production, the platform runs a **Primary Read-Write Node** and a **Hot Standby Replica Node** located in a different Availability Zone (AZ).
- Replication is synchronous or asynchronous (depending on the latency tolerance vs durability requirement).
- If the Primary node suffers hardware failure, Supabase (via PgBouncer/Patroni) automatically promotes the Hot Standby to Primary.
- **RTO (Recovery Time Objective)**: < 60 seconds during a failover event.

### 4.2 Application Resilience During Failover
During a failover, active database connections will drop.
- The Next.js API layer and Edge Functions MUST implement automated retry logic (exponential backoff) for failed database transactions.
- PgBouncer will pause incoming requests while the promotion occurs, preventing the application from crashing, but causing a temporary latency spike.

---

## 5. Storage and Vector Backups

### 5.1 Supabase Storage
- Files in S3-backed Supabase Storage buckets are highly durable (99.999999999% durability).
- Versioning is enabled on the `digital-goods` bucket to prevent accidental overwrites.
- Deleted files are soft-deleted and transitioned to Glacier storage for 30 days before permanent destruction.

### 5.2 pgvector Backups
Vector embeddings in `ai.embeddings` are backed up just like standard relational data. However, if the database is restored from a backup, the HNSW indexes must be rebuilt to ensure optimal search performance.

```sql
-- SRE Post-Restore Command
REINDEX INDEX CONCURRENTLY idx_embeddings_hnsw;
```
