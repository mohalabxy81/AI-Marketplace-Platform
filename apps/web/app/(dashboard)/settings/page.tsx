/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Globe,
  Bell,
  Shield,
  Key,
  Save,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// ── Section types ──────────────────────────────────────────────

type SettingsSection = "general" | "notifications" | "security" | "api";

const SECTIONS: { id: SettingsSection; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "api", label: "API Keys", icon: Key },
];

// ── Field Component ────────────────────────────────────────────

function FieldGroup({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-5 border-b border-[var(--color-border)] last:border-0 flex flex-col md:flex-row md:items-start gap-4">
      <div className="md:w-64 shrink-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 max-w-xs">{description}</p>
        )}
      </div>
      <div className="flex-1 max-w-md">{children}</div>
    </div>
  );
}

function TextInput({ id, value, placeholder, onChange, disabled = false }: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-3 text-sm bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function Toggle({ id, checked, onChange, label }: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
        {label}
      </span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ${
          checked
            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
            : "bg-[var(--color-surface-alt)] border-[var(--color-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

// ── General Section ────────────────────────────────────────────

function GeneralSection({ company }: { company: { name: string; slug?: string; website?: string } | null }) {
  const [name, setName] = useState(company?.name ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [timezone, setTimezone] = useState("UTC");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    // In production: call supabase update + server action
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <FieldGroup label="Company Name" description="The name displayed across your workspace and listings.">
        <TextInput id="company-name" value={name} placeholder="Acme Corp" onChange={setName} />
      </FieldGroup>

      <FieldGroup label="Workspace Slug" description="Used in URLs. Contact support to change.">
        <TextInput id="company-slug" value={company?.slug ?? ""} placeholder="acme" onChange={() => {}} disabled />
      </FieldGroup>

      <FieldGroup label="Website" description="Your company's public website URL.">
        <TextInput id="company-website" value={website} placeholder="https://yourcompany.com" onChange={setWebsite} />
      </FieldGroup>

      <FieldGroup label="Timezone" description="Used for report generation and scheduled jobs.">
        <select
          id="company-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full h-9 px-3 text-sm bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          <option value="UTC">UTC (Coordinated Universal Time)</option>
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="Europe/London">London (GMT)</option>
          <option value="Europe/Paris">Paris (CET)</option>
          <option value="Asia/Dubai">Dubai (GST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
        </select>
      </FieldGroup>

      <div className="pt-4 flex items-center gap-3">
        <Button
          leftIcon={saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          onClick={handleSave}
          id="save-general-settings"
        >
          {saved ? "Saved!" : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Changes saved successfully
          </span>
        )}
      </div>
    </div>
  );
}

// ── Notifications Section ─────────────────────────────────────

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    newLeads: true,
    listingUpdates: true,
    teamActivity: false,
    weeklyReport: true,
    securityAlerts: true,
    marketingEmails: false,
  });

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items: { key: keyof typeof prefs; label: string; description: string }[] = [
    { key: "newLeads", label: "New leads", description: "Get notified when someone contacts you about a listing." },
    { key: "listingUpdates", label: "Listing status changes", description: "Updates when your listings are approved, rejected, or archived." },
    { key: "teamActivity", label: "Team activity", description: "Daily digest of team member actions." },
    { key: "weeklyReport", label: "Weekly analytics report", description: "Summary of views, leads, and performance every Monday." },
    { key: "securityAlerts", label: "Security alerts", description: "Alerts for unusual login activity or permission changes." },
    { key: "marketingEmails", label: "Product updates & tips", description: "Occasional emails about new features and best practices." },
  ];

  return (
    <div className="space-y-0">
      {items.map(({ key, label, description }) => (
        <FieldGroup key={key} label={label} description={description}>
          <Toggle id={`notif-${key}`} checked={prefs[key]} onChange={() => toggle(key)} label="" />
        </FieldGroup>
      ))}
    </div>
  );
}

// ── Security Section ──────────────────────────────────────────

function SecuritySection() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("7");

  return (
    <div>
      <FieldGroup label="Two-Factor Authentication" description="Require 2FA for all workspace members.">
        <Toggle id="mfa-toggle" checked={mfaEnabled} onChange={setMfaEnabled} label={mfaEnabled ? "Enforced for all members" : "Optional (recommended to enable)"} />
      </FieldGroup>

      <FieldGroup label="Session Timeout" description="Automatically log out inactive sessions.">
        <select
          id="session-timeout"
          value={sessionTimeout}
          onChange={(e) => setSessionTimeout(e.target.value)}
          className="w-full h-9 px-3 text-sm bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="never">Never</option>
        </select>
      </FieldGroup>

      <FieldGroup label="Change Password" description="Update your account password.">
        <Button variant="outline" size="sm" leftIcon={<Key className="h-3.5 w-3.5" />} id="change-password-btn">
          Change Password
        </Button>
      </FieldGroup>

      {/* Danger zone */}
      <div className="mt-8 rounded-[var(--radius-sm)] border border-[var(--color-error)]/30 bg-red-950/10 p-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-[var(--color-error)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-error)]">Danger Zone</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              These actions are irreversible. Proceed with caution.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="destructive" size="sm" id="delete-workspace-btn">
            Delete Workspace
          </Button>
          <Button variant="outline" size="sm" id="export-data-btn">
            Export All Data (GDPR)
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── API Section ───────────────────────────────────────────────

function ApiSection() {
  const [showKey, setShowKey] = useState(false);
  const placeholderKey = "sk_live_••••••••••••••••••••••••••••••••";
  const visibleKey = "mock_api_key_xxxxxxxxxxxxxxxxxxxxxxxx";

  return (
    <div>
      <FieldGroup label="API Key" description="Use this key to authenticate API requests from your application.">
        <div className="flex gap-2">
          <input
            id="api-key-display"
            type={showKey ? "text" : "password"}
            value={showKey ? visibleKey : placeholderKey}
            readOnly
            className="flex-1 h-9 px-3 text-sm font-mono bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] focus:outline-none"
          />
          <Button variant="outline" size="sm" onClick={() => setShowKey((v) => !v)} id="toggle-api-key">
            {showKey ? "Hide" : "Reveal"}
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup label="Regenerate Key" description="Creates a new API key and invalidates the current one. This will break existing integrations.">
        <Button variant="destructive" size="sm" leftIcon={<Key className="h-3.5 w-3.5" />} id="regenerate-api-key">
          Regenerate API Key
        </Button>
      </FieldGroup>

      <FieldGroup label="Webhook Endpoint" description="Receive event notifications to your server in real time.">
        <TextInput
          id="webhook-endpoint"
          value=""
          placeholder="https://yourapp.com/webhooks"
          onChange={() => {}}
        />
      </FieldGroup>

      <div className="pt-4">
        <Button leftIcon={<Save className="h-4 w-4" />} id="save-api-settings">
          Save API Settings
        </Button>
      </div>

      {/* Docs callout */}
      <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">API Documentation</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Full REST API reference and code examples.
          </p>
        </div>
        <Button variant="outline" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />} id="view-api-docs">
          View Docs
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const { company } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const sectionComponents: Record<SettingsSection, React.ReactNode> = {
    general: <GeneralSection company={company} />,
    notifications: <NotificationsSection />,
    security: <SecuritySection />,
    api: <ApiSection />,
  };

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Settings</PageTitle>
          <PageDescription>
            Manage your workspace configuration, notifications, and integrations.
          </PageDescription>
        </div>
      </PageHeader>

      <PageContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar nav */}
          <nav className="md:w-48 shrink-0">
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    id={`settings-nav-${id}`}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-[var(--radius-xs)] transition-colors text-left ${
                      activeSection === id
                        ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-medium"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content panel */}
          <div className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
            <div className="flex items-center gap-2 py-4 mb-2 border-b border-[var(--color-border)]">
              {(() => {
                const sec = SECTIONS.find((s) => s.id === activeSection);
                if (!sec) return null;
                const Icon = sec.icon;
                return (
                  <>
                    <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">{sec.label}</h2>
                  </>
                );
              })()}
            </div>
            {sectionComponents[activeSection]}
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
