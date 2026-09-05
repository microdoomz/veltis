'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, Tag as TagIcon, Layers, Sparkles, AlertCircle } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  categoryType: 'expense' | 'income' | 'both';
  isSystem: boolean;
  workspaceId?: string | null;
}

interface TagItem {
  id: string;
  name: string;
}

interface RuleItem {
  id: string;
  pattern: string;
  matchType: string;
  merchantName?: string | null;
  categoryId: string;
  priority: number;
  active: boolean;
}

export function TaxonomyManager() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal open states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Form states
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income' | 'both'>('expense');

  const [tagName, setTagName] = useState('');

  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<'exact' | 'contains' | 'prefix' | 'regex'>('contains');
  const [ruleMerchant, setRuleMerchant] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [rulePriority, setRulePriority] = useState('0');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaxonomy = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/taxonomy');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setTags(data.tags || []);
        setRules(data.rules || []);
        if (data.categories?.length > 0 && !ruleCategoryId) {
          setRuleCategoryId(data.categories[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load taxonomy:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'category',
          name: catName.trim(),
          categoryType: catType,
        }),
      });
      if (!res.ok) throw new Error('Failed to create category');
      setCatName('');
      setIsCategoryModalOpen(false);
      await fetchTaxonomy();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'tag',
          name: tagName.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to create tag');
      setTagName('');
      setIsTagModalOpen(false);
      await fetchTaxonomy();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating tag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim() || !ruleCategoryId) {
      setError('Pattern and Category are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'rule',
          pattern: rulePattern.trim(),
          matchType: ruleMatchType,
          merchantName: ruleMerchant.trim() || undefined,
          categoryId: ruleCategoryId,
          priority: parseInt(rulePriority) || 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to create rule');
      setRulePattern('');
      setRuleMerchant('');
      setIsRuleModalOpen(false);
      await fetchTaxonomy();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entity: 'category' | 'tag' | 'rule', id: string) => {
    try {
      const res = await fetch(`/api/taxonomy?entity=${entity}&id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchTaxonomy();
      }
    } catch (e) {
      console.error(`Failed to delete ${entity}:`, e);
    }
  };

  const customCategories = categories.filter(c => !c.isSystem && c.workspaceId);

  return (
    <div className="space-y-6">
      {/* Custom Categories Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Custom Categories
            </CardTitle>
            <CardDescription>Manage your personalized expense and income categories.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setError(null); setIsCategoryModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading categories...</p>
          ) : customCategories.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4 p-8 text-center border rounded-md border-dashed">
              No custom categories created yet. Click "Add Category" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-4">
              {customCategories.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg border border-border flex items-center justify-between bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <span className="text-[10px] text-muted-foreground uppercase">{c.categoryType}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete('category', c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" /> Tags
            </CardTitle>
            <CardDescription>Organize transactions across different categories.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setError(null); setIsTagModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Tag
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading tags...</p>
          ) : tags.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4 p-8 text-center border rounded-md border-dashed">
              No tags created yet. Use tags like &quot;vacation&quot;, &quot;tax-deductible&quot;, or &quot;gift&quot;.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  #{t.name}
                  <button
                    onClick={() => handleDelete('tag', t.id)}
                    className="hover:text-destructive transition-colors ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merchant Rules Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Merchant Rules
            </CardTitle>
            <CardDescription>Automatically categorize transactions based on merchant names.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setError(null); setIsRuleModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Rule
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading rules...</p>
          ) : rules.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4 p-8 text-center border rounded-md border-dashed">
              No rules created yet. Automatically categorize imports and shortcuts by merchant.
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {rules.map((r) => {
                const targetCat = categories.find(c => c.id === r.categoryId);
                return (
                  <div key={r.id} className="p-3 rounded-lg border border-border flex items-center justify-between bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded border">
                          {r.pattern}
                        </code>
                        <span className="text-[11px] text-muted-foreground">({r.matchType})</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs font-medium text-primary">
                          {targetCat?.name || 'Category'}
                        </span>
                      </div>
                      {r.merchantName && (
                        <p className="text-[11px] text-muted-foreground">Sets merchant: &quot;{r.merchantName}&quot;</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete('rule', r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Custom Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Category Name *</label>
                <Input
                  placeholder="e.g. Pet Care, Books, Freelance"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Category Type</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as 'expense' | 'income' | 'both')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both (Income & Expense)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add New Tag</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleAddTag} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tag Name *</label>
                <Input
                  placeholder="e.g. tax2026, trip-tokyo, client-acme"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsTagModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Tag'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Merchant Rule</h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Search Pattern *</label>
                <Input
                  placeholder="e.g. UBER, STARBUCKS, NETFLIX"
                  value={rulePattern}
                  onChange={(e) => setRulePattern(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Match Type</label>
                  <select
                    value={ruleMatchType}
                    onChange={(e) => setRuleMatchType(e.target.value as typeof ruleMatchType)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="contains">Contains</option>
                    <option value="exact">Exact Match</option>
                    <option value="prefix">Starts With</option>
                    <option value="regex">Regular Expression</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Target Category *</label>
                  <select
                    value={ruleCategoryId}
                    onChange={(e) => setRuleCategoryId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Normalized Merchant Name (Optional)</label>
                <Input
                  placeholder="e.g. Uber, Starbucks Coffee"
                  value={ruleMerchant}
                  onChange={(e) => setRuleMerchant(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
