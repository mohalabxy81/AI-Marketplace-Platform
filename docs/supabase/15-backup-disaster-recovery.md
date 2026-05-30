# 15. BACKUP & DISASTER RECOVERY

> **Status**: Approved
> **Target Audience**: DevOps, Database Architects
> **Domain**: Core Infrastructure

## 1. Executive Summary
The platform relies on Supabase's managed Postgres instance for primary persistence. Disaster Recovery (DR) guarantees are based on Continuous Archiving and Point-in-Time Recovery (PITR).

## 2. Backup Strategy
- **Daily Automated Backups**: Full logical backups managed by Supabase, retained for 30 days.
- **WAL Archiving**: Continuous Write-Ahead Log (WAL) archiving to S3 enables PITR down to the minute.
- **Storage Backups**: S3 buckets (`listing-media`, etc.) have versioning enabled to prevent accidental overwrites and are replicated cross-region.

## 3. Point-In-Time Recovery (PITR)
- **Use Case**: Accidental mass-deletion by a rogue script or compromised `SUPER_ADMIN` account.
- **Execution**: Can be triggered via the Supabase Dashboard. Note that PITR rolls back the *entire* database, not a specific tenant.
- **Data Loss**: RPO (Recovery Point Objective) is < 1 minute. RTO (Recovery Time Objective) depends on database size but typically < 2 hours for a 500GB database.

## 4. Tenant-Level Rollbacks
- Because PITR is global, rolling back the DB to fix Tenant A's mistake deletes the valid work done by Tenant B in the meantime.
- **Mitigation**: Critical data (like `listings`) relies on Soft Deletes (`status = 'ARCHIVED'`). Only the background GDPR-compliance worker can execute hard `DELETE` statements on data older than 30 days.

## 5. Incident Recovery
- If the primary region (e.g., `us-east-1`) suffers a total outage, Supabase Read Replicas in `us-west-2` can be promoted to the Primary instance. DNS routing must be updated to point the API Gateway to the new primary.

## 6. Business Continuity
- **Code Escrow**: All infrastructure as code (Supabase migrations, Terraform) is stored in GitHub.
- **Zero-Lock-In**: Because the platform uses raw Postgres rather than proprietary NoSQL, the database can be dumped via `pg_dump` and hosted on any standard cloud provider (AWS RDS) in a catastrophic vendor lock-in scenario.
