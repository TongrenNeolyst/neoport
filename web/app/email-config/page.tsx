"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";

import {
  getEmailConfigAction,
  updateEmailConfigAction,
} from "@/features/email-distribution";

export default function EmailConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(25);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const result = await getEmailConfigAction();
        if (!result.ok) {
          if (result.error === "Admin only") {
            redirect("/403");
          }
          setError(result.error);
          return;
        }

        const config = result.data;
        if (config) {
          setSmtpHost(config.smtp_host);
          setSmtpPort(config.smtp_port);
          setSmtpUser(config.smtp_user);
          setSmtpPass("");
          setSmtpFrom(config.smtp_from);
          setIsEnabled(config.is_enabled);
        }
      } catch {
        setError("Failed to load config");
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const result = await updateEmailConfigAction({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass || "placeholder",
        smtp_from: smtpFrom,
        is_enabled: isEnabled,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Configuration saved successfully");
      setSmtpPass("");
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--fg-tertiary)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--fg-primary)]">Email Configuration</h1>
          <p className="text-sm text-[var(--fg-tertiary)] mt-1">
            Configure SMTP server for report distribution
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-[var(--bg-danger)]/10 border border-[var(--fg-danger)]/20 rounded-md">
            <p className="text-sm text-[var(--fg-danger)]">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-[var(--fg-success)]/10 border border-[var(--fg-success)]/20 rounded-md">
            <p className="text-sm text-[var(--fg-success)]">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] rounded-lg shadow p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-secondary)]">
                SMTP Host
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
                placeholder="smtp.example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-secondary)]">
                SMTP Port
              </label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
                className="mt-1 block w-full px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
                placeholder="25"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-secondary)]">
                Username
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
                placeholder="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-secondary)]">
                Password
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
                placeholder={smtpPass ? "••••••••" : "Leave empty to keep existing"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-secondary)]">
                From Address
              </label>
              <input
                type="email"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
                placeholder="noreply@example.com"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isEnabled"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 text-[var(--fg-accent)] border-[var(--border-default)] rounded focus:ring-[var(--fg-accent)]"
              />
              <label htmlFor="isEnabled" className="ml-2 block text-sm text-[var(--fg-secondary)]">
                Enable email distribution
              </label>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--fg-accent)] hover:opacity-90 focus:outline-none disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
