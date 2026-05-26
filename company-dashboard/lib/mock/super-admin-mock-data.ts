// lib/mock/super-admin-mock-data.ts
import { type TenantSubscription, type TenantInvoice, type QuotaUsage, type TenantEntitlement } from "@/types/super-admin/billing";
import { type ModerationQueue, type TrustVerification, type FraudScore } from "@/types/super-admin/trust";
import { type AIConfiguration, type AIExperiment, type AIInferenceLog } from "@/types/super-admin/ai";
import { type SupportTicket, type SupportMessage } from "@/types/super-admin/support";
import { type AnalyticsSnapshot, type FeatureFlag, type FeatureRollout } from "@/types/super-admin/analytics";
import { type PlatformAuditLog } from "@/types/super-admin/admin";

// 1. TENANTS & COMPANIES MOCK
export interface MockTenant {
  id: string;
  name: string;
  logo: string | null;
  owner_email: string;
  owner_name: string;
  status: "active" | "suspended" | "trialing";
  plan_id: string;
  created_at: string;
}

export const MOCK_TENANTS: MockTenant[] = [
  {
    id: "co_acme_corp",
    name: "Acme Marketplaces",
    logo: null,
    owner_email: "billing@acme.com",
    owner_name: "Wile E. Coyote",
    status: "active",
    plan_id: "plan_scale",
    created_at: "2025-01-15T08:00:00Z"
  },
  {
    id: "co_cyberdyne",
    name: "Cyberdyne Systems",
    logo: null,
    owner_email: "miles.dyson@cyberdyne.com",
    owner_name: "Miles Dyson",
    status: "active",
    plan_id: "plan_enterprise",
    created_at: "2024-11-01T12:00:00Z"
  },
  {
    id: "co_stark_ind",
    name: "Stark Industries",
    logo: null,
    owner_email: "pepper.potts@stark.com",
    owner_name: "Pepper Potts",
    status: "active",
    plan_id: "plan_enterprise",
    created_at: "2024-09-10T10:30:00Z"
  },
  {
    id: "co_umbrella",
    name: "Umbrella Corp LLC",
    logo: null,
    owner_email: "albert.wesker@umbrella.com",
    owner_name: "Albert Wesker",
    status: "suspended",
    plan_id: "plan_scale",
    created_at: "2025-02-28T14:20:00Z"
  },
  {
    id: "co_hooli",
    name: "Hooli Inc.",
    logo: null,
    owner_email: "gavin.belson@hooli.xyz",
    owner_name: "Gavin Belson",
    status: "active",
    plan_id: "plan_growth",
    created_at: "2025-03-05T09:15:00Z"
  },
  {
    id: "co_dharma",
    name: "Dharma Initiative",
    logo: null,
    owner_email: "pierre.chang@dharma.org",
    owner_name: "Pierre Chang",
    status: "trialing",
    plan_id: "plan_free",
    created_at: "2026-05-10T16:00:00Z"
  },
  {
    id: "co_tyrell",
    name: "Tyrell Corporation",
    logo: null,
    owner_email: "elden.tyrell@tyrell.io",
    owner_name: "Elden Tyrell",
    status: "active",
    plan_id: "plan_enterprise",
    created_at: "2024-05-20T11:00:00Z"
  },
  {
    id: "co_virtucon",
    name: "Virtucon Industries",
    logo: null,
    owner_email: "number.two@virtucon.net",
    owner_name: "Number Two",
    status: "active",
    plan_id: "plan_growth",
    created_at: "2025-10-12T13:40:00Z"
  }
];

// 2. BILLING MOCK DATA
export const MOCK_SUBSCRIPTIONS: TenantSubscription[] = [
  {
    id: "sub_1",
    company_id: "co_acme_corp",
    stripe_subscription_id: "sub_StripeAcme123",
    plan_id: "plan_scale",
    status: "active",
    price_id: "price_scale_monthly",
    quantity: 1,
    cancel_at_period_end: false,
    current_period_start: "2026-05-15T08:00:00Z",
    current_period_end: "2026-06-15T08:00:00Z",
    created_at: "2025-01-15T08:00:00Z",
    updated_at: "2026-05-15T08:00:00Z"
  },
  {
    id: "sub_2",
    company_id: "co_cyberdyne",
    stripe_subscription_id: "sub_StripeCyberdyne999",
    plan_id: "plan_enterprise",
    status: "active",
    price_id: "price_enterprise_custom",
    quantity: 1,
    cancel_at_period_end: false,
    current_period_start: "2026-05-01T12:00:00Z",
    current_period_end: "2026-06-01T12:00:00Z",
    created_at: "2024-11-01T12:00:00Z",
    updated_at: "2026-05-01T12:00:00Z"
  },
  {
    id: "sub_3",
    company_id: "co_stark_ind",
    stripe_subscription_id: "sub_StripeStark777",
    plan_id: "plan_enterprise",
    status: "active",
    price_id: "price_enterprise_custom",
    quantity: 1,
    cancel_at_period_end: false,
    current_period_start: "2026-05-10T10:30:00Z",
    current_period_end: "2026-06-10T10:30:00Z",
    created_at: "2024-09-10T10:30:00Z",
    updated_at: "2026-05-10T10:30:00Z"
  },
  {
    id: "sub_4",
    company_id: "co_umbrella",
    stripe_subscription_id: "sub_StripeUmbrella666",
    plan_id: "plan_scale",
    status: "past_due",
    price_id: "price_scale_monthly",
    quantity: 1,
    cancel_at_period_end: true,
    current_period_start: "2026-04-28T14:20:00Z",
    current_period_end: "2026-05-28T14:20:00Z",
    created_at: "2025-02-28T14:20:00Z",
    updated_at: "2026-04-28T14:20:00Z"
  },
  {
    id: "sub_5",
    company_id: "co_hooli",
    stripe_subscription_id: "sub_StripeHooli888",
    plan_id: "plan_growth",
    status: "active",
    price_id: "price_growth_monthly",
    quantity: 1,
    cancel_at_period_end: false,
    current_period_start: "2026-05-05T09:15:00Z",
    current_period_end: "2026-06-05T09:15:00Z",
    created_at: "2025-03-05T09:15:00Z",
    updated_at: "2026-05-05T09:15:00Z"
  },
  {
    id: "sub_6",
    company_id: "co_tyrell",
    stripe_subscription_id: "sub_StripeTyrell2019",
    plan_id: "plan_enterprise",
    status: "active",
    price_id: "price_enterprise_custom",
    quantity: 1,
    cancel_at_period_end: false,
    current_period_start: "2026-05-20T11:00:00Z",
    current_period_end: "2026-06-20T11:00:00Z",
    created_at: "2024-05-20T11:00:00Z",
    updated_at: "2026-05-20T11:00:00Z"
  },
  {
    id: "sub_7",
    company_id: "co_virtucon",
    stripe_subscription_id: "sub_StripeVirtucon321",
    plan_id: "plan_growth",
    status: "active",
    price_id: "price_growth_monthly",
    quantity: 1,
    cancel_at_period_end: false,
    current_period_start: "2026-05-12T13:40:00Z",
    current_period_end: "2026-06-12T13:40:00Z",
    created_at: "2025-10-12T13:40:00Z",
    updated_at: "2026-05-12T13:40:00Z"
  }
];

export const MOCK_INVOICES: TenantInvoice[] = [
  {
    id: "inv_1",
    company_id: "co_acme_corp",
    stripe_invoice_id: "in_AcmeMay2026",
    subscription_id: "sub_1",
    amount_due: 29900,
    amount_paid: 29900,
    currency: "usd",
    status: "paid",
    invoice_pdf: "https://stripe.com/invoice_pdf_acme_may_2026.pdf",
    hosted_invoice_url: "https://stripe.com/invoice/acme_may_2026",
    created_at: "2026-05-15T08:00:00Z",
    updated_at: "2026-05-15T08:05:00Z"
  },
  {
    id: "inv_2",
    company_id: "co_cyberdyne",
    stripe_invoice_id: "in_CyberdyneMay2026",
    subscription_id: "sub_2",
    amount_due: 99900,
    amount_paid: 99900,
    currency: "usd",
    status: "paid",
    invoice_pdf: "https://stripe.com/invoice_pdf_cyberdyne_may_2026.pdf",
    hosted_invoice_url: "https://stripe.com/invoice/cyberdyne_may_2026",
    created_at: "2026-05-01T12:00:00Z",
    updated_at: "2026-05-01T12:02:00Z"
  },
  {
    id: "inv_3",
    company_id: "co_stark_ind",
    stripe_invoice_id: "in_StarkMay2026",
    subscription_id: "sub_3",
    amount_due: 99900,
    amount_paid: 99900,
    currency: "usd",
    status: "paid",
    invoice_pdf: "https://stripe.com/invoice_pdf_stark_may_2026.pdf",
    hosted_invoice_url: "https://stripe.com/invoice/stark_may_2026",
    created_at: "2026-05-10T10:30:00Z",
    updated_at: "2026-05-10T10:33:00Z"
  },
  {
    id: "inv_4",
    company_id: "co_umbrella",
    stripe_invoice_id: "in_UmbrellaMay2026",
    subscription_id: "sub_4",
    amount_due: 29900,
    amount_paid: 0,
    currency: "usd",
    status: "open",
    invoice_pdf: "https://stripe.com/invoice_pdf_umbrella_may_2026.pdf",
    hosted_invoice_url: "https://stripe.com/invoice/umbrella_may_2026",
    created_at: "2026-04-28T14:20:00Z",
    updated_at: "2026-04-28T14:20:00Z"
  },
  {
    id: "inv_5",
    company_id: "co_hooli",
    stripe_invoice_id: "in_HooliMay2026",
    subscription_id: "sub_5",
    amount_due: 9900,
    amount_paid: 9900,
    currency: "usd",
    status: "paid",
    invoice_pdf: "https://stripe.com/invoice_pdf_hooli_may_2026.pdf",
    hosted_invoice_url: "https://stripe.com/invoice/hooli_may_2026",
    created_at: "2026-05-05T09:15:00Z",
    updated_at: "2026-05-05T09:18:00Z"
  },
  {
    id: "inv_6",
    company_id: "co_umbrella",
    stripe_invoice_id: "in_UmbrellaApril2026",
    subscription_id: "sub_4",
    amount_due: 29900,
    amount_paid: 0,
    currency: "usd",
    status: "uncollectible",
    invoice_pdf: "https://stripe.com/invoice_pdf_umbrella_april_2026.pdf",
    hosted_invoice_url: "https://stripe.com/invoice/umbrella_april_2026",
    created_at: "2026-03-28T14:20:00Z",
    updated_at: "2026-04-28T14:20:00Z"
  }
];

export const MOCK_QUOTAS: QuotaUsage[] = [
  {
    id: "q_1",
    company_id: "co_acme_corp",
    resource_name: "listings",
    limit_amount: 1000,
    current_usage: 642,
    reset_at: "2026-06-15T08:00:00Z",
    updated_at: "2026-05-23T01:00:00Z"
  },
  {
    id: "q_2",
    company_id: "co_acme_corp",
    resource_name: "team_members",
    limit_amount: 20,
    current_usage: 12,
    reset_at: "2026-06-15T08:00:00Z",
    updated_at: "2026-05-23T01:00:00Z"
  },
  {
    id: "q_3",
    company_id: "co_acme_corp",
    resource_name: "api_calls",
    limit_amount: 500000,
    current_usage: 312000,
    reset_at: "2026-06-15T08:00:00Z",
    updated_at: "2026-05-23T01:00:00Z"
  },
  {
    id: "q_4",
    company_id: "co_cyberdyne",
    resource_name: "listings",
    limit_amount: 999999, // custom override
    current_usage: 8402,
    reset_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-05-23T02:00:00Z"
  },
  {
    id: "q_5",
    company_id: "co_cyberdyne",
    resource_name: "team_members",
    limit_amount: 999,
    current_usage: 154,
    reset_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-05-23T02:00:00Z"
  },
  {
    id: "q_6",
    company_id: "co_umbrella",
    resource_name: "listings",
    limit_amount: 1000,
    current_usage: 980,
    reset_at: "2026-05-28T14:20:00Z",
    updated_at: "2026-05-22T10:00:00Z"
  }
];

export const MOCK_ENTITLEMENTS: TenantEntitlement[] = [
  {
    id: "e_1",
    company_id: "co_cyberdyne",
    feature_name: "custom_branding",
    is_enabled: true,
    created_at: "2024-11-01T12:00:00Z",
    updated_at: "2024-11-01T12:00:00Z"
  },
  {
    id: "e_2",
    company_id: "co_cyberdyne",
    feature_name: "custom_ml_weights",
    is_enabled: true,
    created_at: "2024-11-01T12:00:00Z",
    updated_at: "2024-11-01T12:00:00Z"
  },
  {
    id: "e_3",
    company_id: "co_hooli",
    feature_name: "custom_branding",
    is_enabled: true,
    created_at: "2025-03-05T09:15:00Z",
    updated_at: "2025-03-05T09:15:00Z"
  },
  {
    id: "e_4",
    company_id: "co_hooli",
    feature_name: "custom_ml_weights",
    is_enabled: false,
    created_at: "2025-03-05T09:15:00Z",
    updated_at: "2025-03-05T09:15:00Z"
  }
];

// 3. TRUST & SAFETY MOCK DATA
export const MOCK_MODERATION_QUEUE: ModerationQueue[] = [
  {
    id: "mod_item_1",
    company_id: "co_acme_corp",
    target_type: "listing",
    target_id: "lst_AcmeTNTBuster",
    priority: "CRITICAL",
    status: "PENDING",
    risk_score: 94.50,
    reports_count: 8,
    details: {
      title: "Explosive TNT Bundle (Custom DIY)",
      description: "Super high grade TNT. Hand crafted, perfect for trapping roadrunners. Will ship worldwide directly in plain boxes.",
      reporter_comments: [
        "Selling illegal explosives",
        "This breaks listing guidelines immediately",
        "Hazardous material sold online!"
      ]
    },
    assigned_to: "adm_01",
    created_at: "2026-05-22T20:00:00Z",
    updated_at: "2026-05-23T03:00:00Z"
  },
  {
    id: "mod_item_2",
    company_id: "co_umbrella",
    target_type: "listing",
    target_id: "lst_UmbrellaT_Virus",
    priority: "CRITICAL",
    status: "PENDING",
    risk_score: 99.99,
    reports_count: 24,
    details: {
      title: "Mutagenic Viral Agent (T-Strain Version 4.2)",
      description: "Recombinant genetic asset for cell regeneration. Strictly for scientific lab purposes. High contagion warning. Shipping in active thermal containers.",
      reporter_comments: [
        "This is literally a biohazard!",
        "Fictional virus or real danger? Block immediately",
        "Weapon of mass destruction sales"
      ]
    },
    assigned_to: null,
    created_at: "2026-05-23T00:30:00Z",
    updated_at: "2026-05-23T00:30:00Z"
  },
  {
    id: "mod_item_3",
    company_id: "co_hooli",
    target_type: "user",
    target_id: "usr_HooliSpammer",
    priority: "HIGH",
    status: "PENDING",
    risk_score: 82.00,
    reports_count: 5,
    details: {
      user_email: "spammer@hooli.xyz",
      user_name: "FastSales Bot",
      reason: "Automated scraping and message flooding in platform chat channels. Sent 5,000 links in 3 minutes.",
      activity_log: [
        "chat_sent: 'BUY CHEAP WATCHES NOW!!!'",
        "chat_sent: 'BUY CHEAP WATCHES NOW!!!'",
        "chat_sent: 'BUY CHEAP WATCHES NOW!!!'"
      ]
    },
    assigned_to: "adm_01",
    created_at: "2026-05-22T14:00:00Z",
    updated_at: "2026-05-23T01:10:00Z"
  },
  {
    id: "mod_item_4",
    company_id: "co_stark_ind",
    target_type: "listing",
    target_id: "lst_StarkMiniArcReactor",
    priority: "MEDIUM",
    status: "APPROVED",
    risk_score: 35.20,
    reports_count: 1,
    details: {
      title: "Stark Industries Mini Arc Reactor (Replica)",
      description: "Collector replica of the Mark I arc reactor. Standard LED lighting, non-radioactive casing.",
      reporter_comments: [
        "Might be real nuclear material?"
      ]
    },
    assigned_to: "adm_02",
    created_at: "2026-05-21T09:00:00Z",
    updated_at: "2026-05-21T16:00:00Z"
  },
  {
    id: "mod_item_5",
    company_id: "co_virtucon",
    target_type: "listing",
    target_id: "lst_VirtuconLaserShark",
    priority: "HIGH",
    status: "ESCALATED",
    risk_score: 76.50,
    reports_count: 3,
    details: {
      title: "Sharks with Attached Laser Beams (Standard Mount)",
      description: "Genetically augmented aquatic assets featuring military-grade beam tracking modules. Custom shipping in secure water containers.",
      reporter_comments: [
        "Cruelty to animals + weapon grade attachments",
        "Is this a joke or actual hazard?"
      ]
    },
    assigned_to: null,
    created_at: "2026-05-22T10:00:00Z",
    updated_at: "2026-05-22T18:00:00Z"
  }
];

export const MOCK_VERIFICATIONS: TrustVerification[] = [
  {
    id: "v_1",
    company_id: "co_cyberdyne",
    status: "VERIFIED",
    verification_type: "kyb",
    document_url: "https://documents.cyberdyne.com/kyb_incorporation_active.pdf",
    verified_at: "2024-11-02T10:00:00Z",
    verified_by: "adm_01",
    created_at: "2024-11-01T12:00:00Z"
  },
  {
    id: "v_2",
    company_id: "co_umbrella",
    status: "REJECTED",
    verification_type: "tax_id",
    document_url: "https://documents.umbrella.com/tax_filing_racc_city.pdf",
    verified_at: "2025-03-01T11:30:00Z",
    verified_by: "adm_01",
    created_at: "2025-02-28T14:20:00Z"
  },
  {
    id: "v_3",
    company_id: "co_hooli",
    status: "PENDING",
    verification_type: "domain",
    document_url: null,
    verified_at: null,
    verified_by: null,
    created_at: "2026-05-20T09:00:00Z"
  }
];

export const MOCK_FRAUD_SCORES: FraudScore[] = [
  {
    id: "f_1",
    company_id: "co_acme_corp",
    user_id: "usr_WileECoyote",
    score: 12.50,
    flags: [],
    created_at: "2025-01-15T08:00:00Z"
  },
  {
    id: "f_2",
    company_id: "co_umbrella",
    user_id: "usr_WeskerSpam",
    score: 89.20,
    flags: ["vpn_abuse", "bulk_ip_change", "stolen_card_risk"],
    created_at: "2025-02-28T14:20:00Z"
  },
  {
    id: "f_3",
    company_id: "co_hooli",
    user_id: "usr_HooliSpammer",
    score: 95.80,
    flags: ["bot_fingerprint", "chat_abuse"],
    created_at: "2026-05-22T14:00:00Z"
  }
];

// 4. AI GOVERNANCE MOCK DATA
export const MOCK_AI_CONFIG: AIConfiguration = {
  id: "ai_cfg_active",
  active_model_name: "hybrid-search-reverso-v2.5",
  semantic_weight: 0.65,
  keyword_weight: 0.20,
  bm25_weight: 0.15,
  updated_at: "2026-05-18T10:30:00Z",
  updated_by: "adm_01"
};

export const MOCK_AI_EXPERIMENTS: AIExperiment[] = [
  {
    id: "exp_1",
    name: "Vector Hybrid Weight Tuning",
    description: "Evaluating higher semantic weights for product query recommendations.",
    model_a: "hybrid-search-reverso-v2.5 (65% Semantic)",
    model_b: "hybrid-search-reverso-v2.6-beta (80% Semantic)",
    split_percentage: 15,
    status: "ACTIVE",
    created_at: "2026-05-19T08:00:00Z",
    updated_at: "2026-05-19T08:00:00Z"
  },
  {
    id: "exp_2",
    name: "BM25 Fine-Tuning for Automotive Queries",
    description: "Evaluating custom tokenizers for vehicle listing searches.",
    model_a: "hybrid-search-reverso-v2.5 (Standard tokenizer)",
    model_b: "hybrid-search-automotive-v1.0 (WordPiece tokenizer)",
    split_percentage: 50,
    status: "PAUSED",
    created_at: "2026-04-10T14:00:00Z",
    updated_at: "2026-05-01T12:00:00Z"
  }
];

export const MOCK_AI_INFERENCE_LOGS: AIInferenceLog[] = [
  {
    id: "inf_1",
    model_name: "hybrid-search-reverso-v2.5",
    latency_ms: 42,
    tokens_used: 120,
    status_code: 200,
    created_at: "2026-05-23T04:20:00Z"
  },
  {
    id: "inf_2",
    model_name: "hybrid-search-reverso-v2.5",
    latency_ms: 108, // spike
    tokens_used: 195,
    status_code: 200,
    created_at: "2026-05-23T04:21:05Z"
  },
  {
    id: "inf_3",
    model_name: "hybrid-search-reverso-v2.6-beta",
    latency_ms: 58,
    tokens_used: 130,
    status_code: 200,
    created_at: "2026-05-23T04:22:15Z"
  },
  {
    id: "inf_4",
    model_name: "hybrid-search-reverso-v2.5",
    latency_ms: 38,
    tokens_used: 85,
    status_code: 200,
    created_at: "2026-05-23T04:23:45Z"
  },
  {
    id: "inf_5",
    model_name: "hybrid-search-reverso-v2.5",
    latency_ms: 350, // slow query
    tokens_used: 512,
    status_code: 500, // failed index
    created_at: "2026-05-23T04:24:10Z"
  }
];

// 5. OPERATOR SUPPORT MOCK DATA
export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "tkt_1",
    company_id: "co_acme_corp",
    user_id: "usr_WileECoyote",
    subject: "Stripe Payment Portal Refusing Credit Card Charges",
    status: "OPEN",
    priority: "HIGH",
    assigned_to: null,
    created_at: "2026-05-22T09:00:00Z",
    updated_at: "2026-05-23T01:30:00Z"
  },
  {
    id: "tkt_2",
    company_id: "co_cyberdyne",
    user_id: "usr_MilesDyson",
    subject: "Requesting Custom API Rate Limit Increase for Realtime Feeds",
    status: "IN_PROGRESS",
    priority: "CRITICAL",
    assigned_to: null,
    created_at: "2026-05-21T11:00:00Z",
    updated_at: "2026-05-23T04:00:00Z"
  },
  {
    id: "tkt_3",
    company_id: "co_umbrella",
    user_id: "usr_WeskerSpam",
    subject: "Tenant Suspension Inquiry — Urgent",
    status: "OPEN",
    priority: "CRITICAL",
    assigned_to: null,
    created_at: "2026-05-23T02:00:00Z",
    updated_at: "2026-05-23T02:00:00Z"
  },
  {
    id: "tkt_4",
    company_id: "co_hooli",
    user_id: "usr_GavinBelson",
    subject: "Custom UI Branding Logo Alignment in Main Dashboard Banner",
    status: "RESOLVED",
    priority: "LOW",
    assigned_to: null,
    created_at: "2026-05-18T14:00:00Z",
    updated_at: "2026-05-20T10:00:00Z"
  }
];

export const MOCK_SUPPORT_MESSAGES: SupportMessage[] = [
  {
    id: "msg_1_1",
    ticket_id: "tkt_1",
    sender_id: "usr_WileECoyote",
    sender_type: "USER",
    body: "Hi support, every time we attempt to renew or override our billing limits via Stark Card processing, it throws a validation error 400. Need help quickly since our billing cycle is ending.",
    created_at: "2026-05-22T09:00:00Z"
  },
  {
    id: "msg_1_2",
    ticket_id: "tkt_1",
    sender_id: "adm_01",
    sender_type: "ADMIN",
    body: "Hi Wile, I'm checking the logs. It looks like Stripe is throwing a currency mismatch since your tenant profile is USD and the payment card is issuing in CAD. Let me see if I can override the pricing map for you.",
    created_at: "2026-05-23T01:30:00Z"
  },
  {
    id: "msg_2_1",
    ticket_id: "tkt_2",
    sender_id: "usr_MilesDyson",
    sender_type: "USER",
    body: "Umgent requirement: Our Neural Net pipeline index needs to parse 100k records/hour. We are hitting the standard 50k API calls limit. We need an override to 500k immediately.",
    created_at: "2026-05-21T11:00:00Z"
  },
  {
    id: "msg_2_2",
    ticket_id: "tkt_2",
    sender_id: "adm_02",
    sender_type: "ADMIN",
    body: "Dyson, I have received the request. We are evaluating server capacity. I will apply a temporary override of 250k while we finish our scale operations.",
    created_at: "2026-05-22T10:00:00Z"
  },
  {
    id: "msg_2_3",
    ticket_id: "tkt_2",
    sender_id: "usr_MilesDyson",
    sender_type: "USER",
    body: "250k is not enough, our neural net will lock up. Please escalate to SUPER_ADMIN to unlock the full 500k scale tier.",
    created_at: "2026-05-23T04:00:00Z"
  }
];

// 6. RUNTIME ROLLOUTS & FLAGS MOCK
export const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: "flg_1",
    name: "ai-search-hybrid-indexing",
    description: "Enables advanced semantic search index updates during standard marketplace listing creations.",
    is_active: true,
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2026-05-18T10:00:00Z"
  },
  {
    id: "flg_2",
    name: "stripe-tax-auto-computation",
    description: "Uses Stripe Tax API dynamically during tenant checkout flows.",
    is_active: false,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-05-01T12:00:00Z"
  },
  {
    id: "flg_3",
    name: "impersonation-super-admin-only",
    description: "Disables tenant impersonation capabilities for support agents, restricting it to full super admins.",
    is_active: true,
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z"
  },
  {
    id: "flg_4",
    name: "b2b-automatic-kyb-validation",
    description: "Fires automated tax number validation triggers to fraud scoring algorithms during tenant signup.",
    is_active: false,
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  }
];

export const MOCK_ROLLOUTS: FeatureRollout[] = [
  {
    id: "rol_1",
    flag_id: "flg_1",
    rollout_percentage: 85,
    target_rules: {
      plan_tiers: ["plan_scale", "plan_enterprise"]
    },
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2026-05-18T10:00:00Z"
  },
  {
    id: "rol_2",
    flag_id: "flg_2",
    rollout_percentage: 0,
    target_rules: {},
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-05-01T12:00:00Z"
  },
  {
    id: "rol_3",
    flag_id: "flg_3",
    rollout_percentage: 100,
    target_rules: {},
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z"
  },
  {
    id: "rol_4",
    flag_id: "flg_4",
    rollout_percentage: 10,
    target_rules: {
      company_ids: ["co_cyberdyne"]
    },
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  }
];

// 7. SYSTEM AUDIT LOG MOCK DATA
export const MOCK_AUDIT_LOGS: PlatformAuditLog[] = [
  {
    id: "aud_log_1",
    adminId: "adm_01",
    action: "tenant.suspend",
    targetType: "company",
    targetId: "co_umbrella",
    beforeState: { status: "active" },
    afterState: { status: "suspended" },
    ipAddress: "192.168.1.105",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
    createdAt: "2026-05-23T02:15:00Z"
  },
  {
    id: "aud_log_2",
    adminId: "adm_01",
    action: "billing.override_limit",
    targetType: "company",
    targetId: "co_cyberdyne",
    beforeState: { resource: "listings", limit: 1000 },
    afterState: { resource: "listings", limit: 999999 },
    ipAddress: "192.168.1.105",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
    createdAt: "2026-05-23T02:00:00Z"
  },
  {
    id: "aud_log_3",
    adminId: "adm_02",
    action: "ai.update_weights",
    targetType: "ai_configuration",
    targetId: "ai_cfg_active",
    beforeState: { semantic: 0.50, keyword: 0.30, bm25: 0.20 },
    afterState: { semantic: 0.65, keyword: 0.20, bm25: 0.15 },
    ipAddress: "10.0.2.45",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/122.0",
    createdAt: "2026-05-18T10:30:00Z"
  },
  {
    id: "aud_log_4",
    adminId: "adm_01",
    action: "auth.impersonate_start",
    targetType: "user",
    targetId: "usr_MilesDyson",
    beforeState: {},
    afterState: { reason: "Debugging ticket #tkt_2, verifying neural rate overflow" },
    ipAddress: "192.168.1.105",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
    createdAt: "2026-05-23T03:55:00Z"
  },
  {
    id: "aud_log_5",
    adminId: "adm_02",
    action: "flag.toggle",
    targetType: "feature_flag",
    targetId: "flg_1",
    beforeState: { active: false },
    afterState: { active: true },
    ipAddress: "10.0.2.45",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/122.0",
    createdAt: "2026-05-18T10:00:00Z"
  }
];

// 8. BUSINESS BI METRICS & SNAPSHOTS MOCK
export const MOCK_ANALYTICS_SNAPSHOTS: AnalyticsSnapshot[] = [
  {
    id: "snap_1",
    total_mrr: 34500.00,
    total_tenants: 84,
    active_tenants: 72,
    open_tickets: 6,
    moderation_queue_depth: 3,
    snapshot_date: "2026-05-23",
    created_at: "2026-05-23T00:00:00Z"
  },
  {
    id: "snap_2",
    total_mrr: 34100.00,
    total_tenants: 83,
    active_tenants: 71,
    open_tickets: 8,
    moderation_queue_depth: 4,
    snapshot_date: "2026-05-22",
    created_at: "2026-05-22T00:00:00Z"
  },
  {
    id: "snap_3",
    total_mrr: 33800.00,
    total_tenants: 82,
    active_tenants: 70,
    open_tickets: 5,
    moderation_queue_depth: 2,
    snapshot_date: "2026-05-21",
    created_at: "2026-05-21T00:00:00Z"
  },
  {
    id: "snap_4",
    total_mrr: 33500.00,
    total_tenants: 81,
    active_tenants: 69,
    open_tickets: 9,
    moderation_queue_depth: 6,
    snapshot_date: "2026-05-20",
    created_at: "2026-05-20T00:00:00Z"
  },
  {
    id: "snap_5",
    total_mrr: 32900.00,
    total_tenants: 79,
    active_tenants: 68,
    open_tickets: 11,
    moderation_queue_depth: 8,
    snapshot_date: "2026-05-19",
    created_at: "2026-05-19T00:00:00Z"
  },
  {
    id: "snap_6",
    total_mrr: 32000.00,
    total_tenants: 78,
    active_tenants: 65,
    open_tickets: 12,
    moderation_queue_depth: 10,
    snapshot_date: "2026-05-18",
    created_at: "2026-05-18T00:00:00Z"
  },
  {
    id: "snap_7",
    total_mrr: 29500.00,
    total_tenants: 74,
    active_tenants: 60,
    open_tickets: 15,
    moderation_queue_depth: 14,
    snapshot_date: "2026-05-11",
    created_at: "2026-05-11T00:00:00Z"
  },
  {
    id: "snap_8",
    total_mrr: 25000.00,
    total_tenants: 65,
    active_tenants: 52,
    open_tickets: 18,
    moderation_queue_depth: 20,
    snapshot_date: "2026-04-23",
    created_at: "2026-04-23T00:00:00Z"
  }
];
