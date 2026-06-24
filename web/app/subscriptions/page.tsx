"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";

import {
  listSubscriptionsAction,
  addSubscriptionAction,
  deleteSubscriptionAction,
  type EmailSubscription,
  type SubscriptionType,
} from "@/features/email-distribution";

const subscriptionTypeLabels: Record<SubscriptionType, string> = {
  normal: "普通订阅",
  wind: "Wind",
  tonghuashun: "同花顺",
  bloomberg_zh: "彭博（中文）",
  bloomberg_en: "彭博（英文）",
};

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<EmailSubscription[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newSubscriptionType, setNewSubscriptionType] = useState<SubscriptionType>("normal");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const result = await listSubscriptionsAction();
        if (!result.ok) {
          if (result.error === "Admin only") {
            redirect("/403");
          }
          setError(result.error);
          return;
        }
        setSubscriptions(result.data);
      } catch {
        setError("Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    }

    loadSubscriptions();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setError(null);
    setSuccess(null);
    setAdding(true);

    try {
      const result = await addSubscriptionAction(newEmail.trim(), newSubscriptionType);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Subscription added successfully");
      setNewEmail("");
      setNewSubscriptionType("normal");
      const listResult = await listSubscriptionsAction();
      if (listResult.ok) {
        setSubscriptions(listResult.data);
      }
    } catch {
      setError("Failed to add subscription");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await deleteSubscriptionAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Subscription deleted");
      setSubscriptions(subscriptions.filter((s) => s.id !== id));
    } catch {
      setError("Failed to delete subscription");
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--fg-primary)]">Email Subscriptions</h1>
          <p className="text-sm text-[var(--fg-tertiary)] mt-1">
            Manage email subscription list for report distribution
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

        <div className="bg-[var(--bg-surface)] rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">
            Add Subscription
          </h2>
          <form onSubmit={handleAdd} className="flex gap-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
              required
            />
            <select
              value={newSubscriptionType}
              onChange={(e) => setNewSubscriptionType(e.target.value as SubscriptionType)}
              className="px-3 py-2 border border-[var(--border-default)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--fg-accent)] focus:border-[var(--fg-accent)] bg-[var(--bg-surface)] text-[var(--fg-primary)]"
            >
              <option value="normal">普通订阅</option>
              <option value="wind">Wind</option>
              <option value="tonghuashun">同花顺</option>
              <option value="bloomberg_zh">彭博（中文）</option>
              <option value="bloomberg_en">彭博（英文）</option>
            </select>
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--fg-accent)] hover:opacity-90 focus:outline-none disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-lg shadow">
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)]">
              Subscription List ({subscriptions.length})
            </h2>
          </div>

          {subscriptions.length === 0 ? (
            <div className="p-6 text-center text-[var(--fg-tertiary)]">
              No subscriptions yet
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--border-subtle)]">
              <thead className="bg-[var(--bg-subtle)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                    Subscription Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                    Subscribed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--fg-primary)]">{sub.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--fg-secondary)]">
                        {subscriptionTypeLabels[sub.subscription_type] || sub.subscription_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--fg-secondary)]">
                        {formatDate(sub.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sub.is_active
                            ? "bg-[var(--fg-success)]/10 text-[var(--fg-success)]"
                            : "bg-[var(--fg-tertiary)]/10 text-[var(--fg-tertiary)]"
                        }`}
                      >
                        {sub.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="text-[var(--fg-danger)] hover:opacity-80"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
