import { LLMDashboard } from './LLMDashboard';
import { TokenManagement } from './TokenManagement';
import { Playground } from './Playground';

interface LLMConsoleModuleProps {
  activeItem: string;
}

export function LLMConsoleModule({ activeItem }: LLMConsoleModuleProps) {
  switch (activeItem) {
    case 'playground':
      return <Playground />;
    case 'dashboard':
      return <LLMDashboard />;
    case 'tokens':
      return <TokenManagement />;
    case 'usage':
      return (
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-2">Usage Logs</h2>
          <p className="text-muted-foreground">View your API usage history and analytics.</p>
        </div>
      );
    case 'wallet':
      return (
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-2">Wallet</h2>
          <p className="text-muted-foreground">Manage your balance and billing.</p>
        </div>
      );
    case 'profile':
      return (
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-2">Profile Settings</h2>
          <p className="text-muted-foreground">Update your account preferences.</p>
        </div>
      );
    default:
      return <LLMDashboard />;
  }
}
