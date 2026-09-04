'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function TaxonomyManager() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Custom Categories</CardTitle>
            <CardDescription>Manage your personalized expense and income categories.</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mt-4 p-8 text-center border rounded-md border-dashed">
            No custom categories created yet.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Tags</CardTitle>
            <CardDescription>Organize transactions across different categories.</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mt-4 p-8 text-center border rounded-md border-dashed">
            No tags created yet.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Merchant Rules</CardTitle>
            <CardDescription>Automatically categorize transactions based on merchant names.</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mt-4 p-8 text-center border rounded-md border-dashed">
            No rules created yet.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
