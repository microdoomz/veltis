import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getActiveShortcutTokens } from '@/lib/services/shortcut';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteShortcutTokenAction } from '@/app/actions/shortcut';
import { CreateShortcutForm } from './create-form';

export default async function ShortcutsPage() {
  const authContext = await requireWorkspaceAccess();
  
  const tokens = await getActiveShortcutTokens(authContext.workspaceId);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Apple Shortcuts</h1>
      
      <p className="text-gray-600 mb-8">
        Generate tokens to securely log expenses via Apple Shortcuts without needing to log in.
      </p>

      <CreateShortcutForm workspaceId={authContext.workspaceId} />

      <h2 className="text-xl font-semibold mb-4">Active Tokens</h2>
      {tokens.length === 0 ? (
        <p className="text-gray-500">No active shortcut tokens.</p>
      ) : (
        <div className="space-y-4">
          {tokens.map(token => (
            <Card key={token.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{token.name}</p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(token.createdAt).toLocaleDateString()}
                  {token.lastUsedAt && ` • Last used: ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <form action={deleteShortcutTokenAction.bind(null, authContext.workspaceId)}>
                <input type="hidden" name="tokenId" value={token.id} />
                <Button variant="danger" size="sm" type="submit">Revoke</Button>
              </form>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12 bg-gray-50 p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Create a new token above and copy it.</li>
          <li>Open the Shortcuts app on your iPhone.</li>
          <li>Create a new Shortcut.</li>
          <li>Add a &quot;Get contents of URL&quot; action.</li>
          <li>Set the URL to: <code>https://your-app.com/api/shortcuts/expense</code></li>
          <li>Set Method to <code>POST</code>.</li>
          <li>Add Headers:
            <ul className="list-disc pl-5 mt-1">
              <li><code>Authorization</code>: <code>Bearer YOUR_TOKEN_HERE</code></li>
              <li><code>Content-Type</code>: <code>application/json</code></li>
            </ul>
          </li>
          <li>Set Request Body to JSON with keys:
            <ul className="list-disc pl-5 mt-1">
              <li><code>amount</code> (Number)</li>
              <li><code>description</code> (Text)</li>
              <li><code>idempotencyKey</code> (Text, e.g., Current Date/Time)</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}
