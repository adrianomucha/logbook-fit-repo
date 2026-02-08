import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Users, Dumbbell, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CoachNavTab = 'dashboard' | 'clients' | 'plans';

interface CoachNavProps {
  /** Currently active tab */
  activeTab: CoachNavTab;
  /** Title to display (defaults based on activeTab if not provided) */
  title?: string;
  /** Number of unread messages to show as badge on Clients tab */
  unreadCount?: number;
  /** For detail pages: show back button with this context */
  backTo?: {
    label: string;
    path: string;
  };
  /** Client info to display next to back button (for client profile pages) */
  clientInfo?: {
    name: string;
    avatar?: string;
  };
  /** Handler for tab changes (for in-page view switching like CoachDashboard) */
  onTabChange?: (tab: CoachNavTab) => void;
}

export function CoachNav({
  activeTab,
  title,
  unreadCount = 0,
  backTo,
  clientInfo,
  onTabChange,
}: CoachNavProps) {
  const navigate = useNavigate();

  // Default titles based on active tab
  const defaultTitles: Record<CoachNavTab, string> = {
    dashboard: 'Dashboard',
    clients: 'Clients',
    plans: 'Plans',
  };

  const displayTitle = title || defaultTitles[activeTab];

  const handleTabClick = (tab: CoachNavTab) => {
    // If onTabChange is provided, use it (for in-page view switching)
    if (onTabChange) {
      onTabChange(tab);
      return;
    }

    // Otherwise, navigate to the appropriate route
    switch (tab) {
      case 'dashboard':
        navigate('/coach');
        break;
      case 'clients':
        navigate('/coach/clients');
        break;
      case 'plans':
        navigate('/coach?view=plans');
        break;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left side: Title or Back + Client Info */}
      <div className="flex items-center gap-3">
        {backTo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backTo.path)}
            className="shrink-0"
            aria-label={backTo.label}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        {clientInfo ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{clientInfo.avatar || '👤'}</span>
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {clientInfo.name}
            </h1>
          </div>
        ) : (
          <h1 className="text-2xl sm:text-3xl font-bold">{displayTitle}</h1>
        )}
      </div>

      {/* Right side: Navigation tabs */}
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          variant={activeTab === 'dashboard' ? 'default' : 'outline'}
          onClick={() => handleTabClick('dashboard')}
          className="flex-1 sm:flex-none"
          size="sm"
        >
          <Home className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>

        <Button
          variant={activeTab === 'clients' ? 'default' : 'outline'}
          onClick={() => handleTabClick('clients')}
          className="flex-1 sm:flex-none"
          size="sm"
        >
          <Users className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Clients</span>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                'ml-1 px-1.5 py-0 h-5 text-xs',
                activeTab === 'clients' && 'bg-white text-primary'
              )}
            >
              {unreadCount}
            </Badge>
          )}
        </Button>

        <Button
          variant={activeTab === 'plans' ? 'default' : 'outline'}
          onClick={() => handleTabClick('plans')}
          className="flex-1 sm:flex-none"
          size="sm"
        >
          <Dumbbell className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Plans</span>
        </Button>
      </div>
    </div>
  );
}
