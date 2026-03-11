'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { getApiClient } from '@/lib/api';
import {
  GET_PROPOSAL_BUDGET,
  SET_BUDGET,
  UPDATE_SPENT_AMOUNT,
  type Budget,
  formatCurrency,
} from '@/lib/queries/budget';
import { Button } from '@/components/ui/button';
import { DollarSign, Pencil } from 'lucide-react';

interface BudgetSectionProps {
  proposalId: string;
  isAdmin: boolean;
}

export default function BudgetSection({ proposalId, isAdmin }: BudgetSectionProps) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editingSpent, setEditingSpent] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [spentAmount, setSpentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBudget = useCallback(async () => {
    try {
      const client = getApiClient();
      const data = await client.request<{ proposalBudget: Budget | null }>(
        GET_PROPOSAL_BUDGET,
        { proposalId }
      );
      setBudget(data.proposalBudget);
      if (data.proposalBudget) {
        setApprovedAmount(data.proposalBudget.approvedAmount.toString());
        setSpentAmount(data.proposalBudget.spentAmount.toString());
      }
    } catch (err) {
      console.error('Failed to load budget:', err);
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const handleSetBudget = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat(approvedAmount);
    if (isNaN(amount) || amount < 0) return;
    setSaving(true);
    try {
      const client = getApiClient();
      const data = await client.request<{ setBudget: Budget }>(SET_BUDGET, {
        proposalId,
        approvedAmount: amount,
        currency: 'USD',
      });
      setBudget(data.setBudget);
      setEditingBudget(false);
    } catch (err) {
      console.error('Failed to set budget:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSpent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat(spentAmount);
    if (isNaN(amount) || amount < 0) return;
    setSaving(true);
    try {
      const client = getApiClient();
      const data = await client.request<{ updateSpentAmount: Budget }>(UPDATE_SPENT_AMOUNT, {
        proposalId,
        spentAmount: amount,
      });
      setBudget(data.updateSpentAmount);
      setEditingSpent(false);
    } catch (err) {
      console.error('Failed to update spent amount:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-20 rounded-lg" />;
  }

  const spentPct =
    budget && budget.approvedAmount > 0
      ? Math.min(Math.round((budget.spentAmount / budget.approvedAmount) * 100), 100)
      : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={18} className="text-emerald-600" />
        <h2 className="text-base font-semibold">Budget</h2>
      </div>

      {budget ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Approved</p>
              <p className="font-semibold text-emerald-600">
                {formatCurrency(budget.approvedAmount, budget.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Spent</p>
              <p className="font-semibold">
                {formatCurrency(budget.spentAmount, budget.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Remaining</p>
              <p className="font-semibold text-blue-600">
                {formatCurrency(budget.variance, budget.currency)}
              </p>
            </div>
            {budget.costPerUnit > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Cost/Unit</p>
                <p className="font-semibold">
                  {formatCurrency(budget.costPerUnit, budget.currency)}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">{spentPct}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  spentPct > 90 ? 'bg-red-500' : spentPct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${spentPct}%` }}
              />
            </div>
          </div>

          {/* Admin edit controls */}
          {isAdmin && (
            <div className="pt-2 space-y-2">
              {editingBudget ? (
                <form onSubmit={handleSetBudget} className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border bg-background"
                    placeholder="Approved amount"
                  />
                  <Button type="submit" size="sm" className="text-xs" disabled={saving}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setEditingBudget(false)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <button
                  onClick={() => setEditingBudget(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={12} /> Edit approved amount
                </button>
              )}

              {editingSpent ? (
                <form onSubmit={handleUpdateSpent} className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={spentAmount}
                    onChange={(e) => setSpentAmount(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border bg-background"
                    placeholder="Spent amount"
                  />
                  <Button type="submit" size="sm" className="text-xs" disabled={saving}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setEditingSpent(false)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <button
                  onClick={() => setEditingSpent(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={12} /> Update spent amount
                </button>
              )}
            </div>
          )}
        </div>
      ) : isAdmin ? (
        <div>
          {editingBudget ? (
            <form onSubmit={handleSetBudget} className="space-y-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border bg-background"
                placeholder="Approved budget amount"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Set Budget'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingBudget(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground mb-2">No budget set yet.</p>
              <Button size="sm" variant="outline" onClick={() => setEditingBudget(true)}>
                Set Budget
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-3">
          No budget information available.
        </p>
      )}
    </div>
  );
}
