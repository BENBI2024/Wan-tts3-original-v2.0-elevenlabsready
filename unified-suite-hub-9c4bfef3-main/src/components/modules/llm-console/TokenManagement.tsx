import { Key, Plus, Copy, Trash2, Eye, EyeOff, Search, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ApiToken {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  quota: string;
  group: string;
  secretKey: string;
  models: string;
}

const mockTokens: ApiToken[] = [
  {
    id: '1',
    name: 'jims',
    status: 'active',
    quota: 'Unlimited',
    group: 'User Group',
    secretKey: 'sk-Mvbx**********s3sA',
    models: 'Unlimited',
  },
  {
    id: '2',
    name: 'test',
    status: 'active',
    quota: 'Unlimited',
    group: 'User Group',
    secretKey: 'sk-upjg**********ExYd',
    models: 'Unlimited',
  },
];

export function TokenManagement() {
  const [tokens] = useState<ApiToken[]>(mockTokens);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5" />
          <h1 className="text-xl font-semibold">Token Management</h1>
        </div>
        <Button variant="outline" size="sm">
          Compact View
        </Button>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="text-primary border-primary">
          <Plus className="w-4 h-4 mr-1" />
          Add Token
        </Button>
        <Button variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-1" />
          Copy Selected
        </Button>
        <Button variant="outline" size="sm" className="text-destructive border-destructive">
          <Trash2 className="w-4 h-4 mr-1" />
          Delete Selected
        </Button>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search keywords" className="pl-9 w-48" />
          </div>
          <div className="relative">
            <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Secret key" className="pl-9 w-36" />
          </div>
          <Button variant="outline" size="sm">
            Search
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <input type="checkbox" className="rounded border-border" />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Secret Key</TableHead>
              <TableHead>Models</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>
                  <input type="checkbox" className="rounded border-border" />
                </TableCell>
                <TableCell className="font-medium">{token.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="status-badge-success border-success/30"
                  >
                    Active
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{token.quota}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{token.group}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {token.secretKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleKeyVisibility(token.id)}
                    >
                      {visibleKeys[token.id] ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{token.models}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Chat
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Open Chat</DropdownMenuItem>
                        <DropdownMenuItem>View Logs</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Disable
                    </Button>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing 1-2 of 2 items
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page 1</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled>
              {'<'}
            </Button>
            <Button variant="default" size="icon" className="h-8 w-8">
              1
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled>
              {'>'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
