// Enhanced Central Accounts Page with warmup pipeline sorting and comprehensive account management
// Features: Smart sorting by warmup completion, clickable fields for clipboard copy, token fetching, account management actions

import React, { useState, useEffect } from "react";
import { Account } from "../types/accounts";
import { WarmupStatusSummary } from "../types/warmup";
import api from "../services/api";
import { toast } from "react-hot-toast";

interface WarmupAccountData extends Account {
  warmupStatus?: WarmupStatusSummary;
  completedPhases: number;
  totalPhases: number;
  hasCompletedUsername: boolean;
  hasCompletedAllPhases: boolean;
  assignedUsername?: string;
  transferred?: boolean;
  token?: string;
}

const CentralAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<WarmupAccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenFetching, setTokenFetching] = useState<{
    [key: number]: boolean;
  }>({});
  const [transferring, setTransferring] = useState<{ [key: number]: boolean }>(
    {}
  );

  useEffect(() => {
    fetchAccountsWithWarmupStatus();
  }, []);

  const fetchAccountsWithWarmupStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all accounts
      const accountsResponse = await api.get("/accounts?limit=1000");
      const allAccounts: Account[] = accountsResponse.data.data.accounts;

      if (allAccounts.length === 0) {
        setAccounts([]);
        return;
      }

      // Get account IDs for batch warmup status fetch
      const accountIds = allAccounts.map((acc) => acc.id);

      // Fetch warmup status for all accounts in batch
      const warmupResponse = await api.get(
        `/accounts/warmup/batch-status?account_ids=${accountIds.join(",")}`
      );
      const warmupStatuses = warmupResponse.data.data;

      // Combine account data with warmup status
      const accountsWithWarmup: WarmupAccountData[] = allAccounts.map(
        (account) => {
          const warmupStatus = warmupStatuses[account.id];
          const completedPhases = warmupStatus?.completed_phases || 0;
          const totalPhases = warmupStatus?.total_phases || 0;

          // Check if username phase is completed
          const hasCompletedUsername =
            warmupStatus?.phases?.some(
              (phase: any) =>
                phase.phase === "username" && phase.status === "completed"
            ) || false;

          // Check if all phases are completed
          const hasCompletedAllPhases =
            totalPhases > 0 && completedPhases === totalPhases;

          // Get assigned username from username phase
          const usernamePhase = warmupStatus?.phases?.find(
            (phase: any) => phase.phase === "username"
          );
          const assignedUsername =
            usernamePhase?.assigned_text?.text_content || account.new_username;

          return {
            ...account,
            warmupStatus,
            completedPhases,
            totalPhases,
            hasCompletedUsername,
            hasCompletedAllPhases,
            assignedUsername,
            transferred: account.status === "transferred",
          };
        }
      );

      // Filter out invalid accounts (marked as banned/archived)
      // When users click "Invalid" button, accounts get status='banned' and lifecycle_state='archived'
      const validAccounts = accountsWithWarmup.filter((account) => {
        // Exclude accounts marked as invalid (banned status with archived lifecycle)
        const isInvalid =
          account.status === "banned" && account.lifecycle_state === "archived";
        return !isInvalid;
      });

      // Log filtering results for debugging
      const filteredCount = accountsWithWarmup.length - validAccounts.length;
      if (filteredCount > 0) {
        console.log(
          `Filtered out ${filteredCount} invalid accounts from display`
        );
      }

      // Sort accounts according to requirements:
      // 1. Accounts with all warmup phases completed (top)
      // 2. Accounts with username phase completed
      // 3. Accounts by most phases completed
      const sortedAccounts = validAccounts.sort((a, b) => {
        // First priority: All phases completed
        if (a.hasCompletedAllPhases && !b.hasCompletedAllPhases) return -1;
        if (!a.hasCompletedAllPhases && b.hasCompletedAllPhases) return 1;

        // Second priority: Username phase completed
        if (a.hasCompletedUsername && !b.hasCompletedUsername) return -1;
        if (!a.hasCompletedUsername && b.hasCompletedUsername) return 1;

        // Third priority: Most phases completed
        if (a.completedPhases !== b.completedPhases) {
          return b.completedPhases - a.completedPhases;
        }

        // Final sort by account ID for consistency
        return a.id - b.id;
      });

      setAccounts(sortedAccounts);
    } catch (err: any) {
      console.error("Error fetching accounts with warmup status:", err);
      setError(err.response?.data?.message || "Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleGetToken = async (account: Account) => {
    if (!account.email || !account.email_password) {
      toast.error("Email or email password missing for this account");
      return;
    }

    setTokenFetching((prev) => ({ ...prev, [account.id]: true }));

    try {
      const response = await api.post("/automation/fetch-manual-token", {
        email: account.email,
        email_password: account.email_password,
      });

      const token = response.data.token;

      // Update the account data with the token
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === account.id ? { ...acc, token } : acc))
      );

      // Copy token to clipboard
      await navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard!");
    } catch (err: any) {
      console.error("Error fetching token:", err);
      toast.error(
        `Failed to fetch token: ${err.response?.data?.error || "Unknown error"}`
      );
    } finally {
      setTokenFetching((prev) => ({ ...prev, [account.id]: false }));
    }
  };

  const handleMarkInvalid = async (account: Account) => {
    if (!window.confirm(`Mark account ${account.username} as invalid?`)) {
      return;
    }

    try {
      // Update account status to inactive/banned
      await api.put(`/accounts/${account.id}`, {
        status: "banned",
        lifecycle_state: "archived",
      });

      // Refresh the accounts list
      await fetchAccountsWithWarmupStatus();
      toast.success(`Account ${account.username} marked as invalid`);
    } catch (err: any) {
      console.error("Error marking account as invalid:", err);
      toast.error(
        `Failed to mark account as invalid: ${err.response?.data?.message || "Unknown error"}`
      );
    }
  };

  const handleMarkTransferred = async (account: Account) => {
    if (!window.confirm(`Mark account ${account.username} as transferred?`)) {
      return;
    }

    setTransferring((prev) => ({ ...prev, [account.id]: true }));

    try {
      // Update account status to transferred and lifecycle to archived
      await api.put(`/accounts/${account.id}`, {
        status: "transferred",
        lifecycle_state: "archived",
      });

      // Refresh the accounts list
      await fetchAccountsWithWarmupStatus();
      toast.success(`Account ${account.username} marked as transferred`);
    } catch (err: any) {
      console.error("Error marking account as transferred:", err);
      toast.error(
        `Failed to mark account as transferred: ${err.response?.data?.message || "Unknown error"}`
      );
    } finally {
      setTransferring((prev) => ({ ...prev, [account.id]: false }));
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text || text === "N/A" || text === "-") {
      toast.error(`No ${fieldName} to copy`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${fieldName} copied to clipboard!`);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const ClickableCell: React.FC<{
    value: string;
    fieldName: string;
    className?: string;
  }> = ({
    value,
    fieldName,
    className = "text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded transition-colors",
  }) => (
    <span
      className={className}
      onClick={() => copyToClipboard(value, fieldName)}
      title={`Click to copy ${fieldName}`}
    >
      {value || "N/A"}
    </span>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accounts Hub</h1>
        <p className="text-gray-600">
          Accounts sorted by warmup completion: All phases completed → Username
          completed → Most phases completed
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Total accounts: {accounts.length} | Click any field to copy to
          clipboard
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Phases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className={`hover:bg-gray-50 ${account.transferred ? "bg-green-50 border-l-4 border-l-green-500" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ClickableCell
                      value={account.container_number?.toString() || "N/A"}
                      fieldName="Container Number"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ClickableCell
                      value={
                        account.hasCompletedUsername
                          ? account.assignedUsername || account.username
                          : account.username
                      }
                      fieldName="Username"
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ClickableCell
                      value={account.assignedUsername || "Not assigned"}
                      fieldName="Assigned Username"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ClickableCell
                      value={account.password || "N/A"}
                      fieldName="Password"
                      className="text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded transition-colors font-mono"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ClickableCell value={account.email} fieldName="Email" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ClickableCell
                      value={
                        account.email_password || account.account_code || "N/A"
                      }
                      fieldName="Email Password"
                      className="text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded transition-colors font-mono"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ClickableCell
                        value={account.token || "N/A"}
                        fieldName="Token"
                        className="text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded transition-colors font-mono"
                      />
                      <button
                        onClick={() => handleGetToken(account)}
                        disabled={
                          tokenFetching[account.id] ||
                          !account.email ||
                          !account.email_password
                        }
                        className="text-blue-600 hover:text-blue-900 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                      >
                        {tokenFetching[account.id] ? "Getting..." : "Get"}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {account.completedPhases}/{account.totalPhases}
                      </span>
                      {account.hasCompletedAllPhases && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Complete
                        </span>
                      )}
                      {account.hasCompletedUsername &&
                        !account.hasCompletedAllPhases && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Username ✓
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {account.transferred ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Transferred
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleMarkInvalid(account)}
                          className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded hover:bg-red-50 transition-colors"
                        >
                          Invalid
                        </button>
                        <button
                          onClick={() => handleMarkTransferred(account)}
                          disabled={transferring[account.id]}
                          className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-300 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {transferring[account.id]
                            ? "Marking..."
                            : "Transferred"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No accounts found</div>
        </div>
      )}
    </div>
  );
};

export default CentralAccountsPage;
