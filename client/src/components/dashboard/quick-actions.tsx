import { Plus, Camera, ClipboardList, AlertTriangle, FileText, Paintbrush } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

function QuickActions() {
  const { t } = useTranslation('dashboard');
  const [, setLocation] = useLocation();

  const navigateToWork = (segment: string) => {
    localStorage.setItem("work.segment", JSON.stringify(segment));
    setLocation("/work");
  };

  const actions = [
    {
      icon: Plus,
      label: t('quickActions.addProject'),
      isPrimary: true,
      onClick: () => navigateToWork("projects")
    },
    {
      icon: ClipboardList,
      label: t('quickActions.addTasks'),
      isPrimary: false,
      onClick: () => navigateToWork("tasks")
    },
    {
      icon: Camera,
      label: t('quickActions.uploadPhotos'),
      isPrimary: false,
      onClick: () => setLocation("/photos")
    },
    {
      icon: AlertTriangle,
      label: t('quickActions.addIssue'),
      isPrimary: false,
      onClick: () => setLocation("/client-portal?tab=issues")
    },
    {
      icon: FileText,
      label: t('quickActions.addLog'),
      isPrimary: false,
      onClick: () => setLocation("/logs")
    },
    {
      icon: Paintbrush,
      label: t('quickActions.finishMaterials'),
      isPrimary: false,
      onClick: () => setLocation("/client-portal?tab=materials")
    }
  ];

  return (
    <div 
      className="rounded-xl w-full"
      style={{ backgroundColor: '#161B22', border: '1px solid #2D333B' }}
      data-testid="quick-actions"
    >
      <div className="p-5 border-b" style={{ borderColor: '#2D333B' }}>
        <h3 className="text-lg font-semibold text-white">{t('quickActions.title')}</h3>
      </div>
      <div className="p-5 grid grid-cols-3 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={`action-${index}-${action.label}`}
              className="flex flex-col items-center justify-center py-5 gap-2 rounded-xl transition-all duration-200 cursor-pointer hover:translate-y-[-2px]"
              style={{
                backgroundColor: action.isPrimary ? '#4ADE80' : '#1F242C',
                border: action.isPrimary ? 'none' : '1px solid #2D333B',
                color: action.isPrimary ? '#0F1115' : '#9CA3AF',
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                action.onClick();
              }}
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon 
                size={24}
                style={{ color: action.isPrimary ? '#0F1115' : '#4ADE80' }}
              />
              <span className="font-medium text-sm text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;
