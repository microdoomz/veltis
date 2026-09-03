'use client';

import { useState } from 'react';
import { addShortcutTokenAction } from '@/app/actions/shortcut';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function CreateShortcutForm({ workspaceId }: { workspaceId: string }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setSecret(null);
    try {
      const formData = new FormData();
      formData.append('name', name);
      const res = await addShortcutTokenAction(workspaceId, formData);
      setSecret(res.rawToken);
      setName('');
    } catch (err) {
      console.error(err);
      alert('Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <h3 className="font-semibold mb-2">Create New Token</h3>
      {secret ? (
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <p className="font-medium text-green-900 mb-2">Token created successfully!</p>
          <p className="text-sm text-green-800 mb-2">Copy this token now. You will not be able to see it again.</p>
          <code className="block bg-white p-2 border rounded text-xs select-all break-all">
            {secret}
          </code>
          <Button className="mt-4" onClick={() => setSecret(null)}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., iPhone Personal"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </form>
      )}
    </Card>
  );
}
