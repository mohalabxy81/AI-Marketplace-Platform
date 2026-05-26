"use server";

import type { DbListing, InsertListing, UpdateListing } from "@/types/database";

import { requireCompanyAuth, authorizeAction } from "@/services/auth/permissions";
import { logAuditEvent } from "@/services/audit/audit.service";

export async function getListings() {
  const { supabase, companyId } = await requireCompanyAuth();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DbListing[];
}

export async function getListingById(id: string) {
  const { supabase, companyId } = await requireCompanyAuth();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) throw error;
  return data as DbListing;
}

export async function createListing(listing: Omit<InsertListing, "company_id" | "created_by">) {
  const { supabase, user, companyId } = await authorizeAction("listings.create");

  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...listing,
      company_id: companyId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  
  await logAuditEvent({
    action: "listing.created",
    entityType: "listing",
    entityId: data.id,
    metadata: { title: data.title, type: data.type },
  });
  
  return data as DbListing;
}

export async function updateListing(id: string, updates: UpdateListing) {
  const { supabase, companyId } = await authorizeAction("listings.edit");

  const { data, error } = await supabase
    .from("listings")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId) // Security: enforce tenant
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent({
    action: "listing.updated",
    entityType: "listing",
    entityId: data.id,
    metadata: { updates: Object.keys(updates) },
  });

  return data as DbListing;
}

export async function deleteListing(id: string) {
  const { supabase, companyId } = await authorizeAction("listings.delete");

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId); // Security: enforce tenant

  if (error) throw error;

  await logAuditEvent({
    action: "listing.deleted",
    entityType: "listing",
    entityId: id,
  });
}
