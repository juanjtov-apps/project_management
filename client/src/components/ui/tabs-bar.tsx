import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabsBarProps {
  tabs: Tab[];
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  "data-testid"?: string;
}

export function TabsBar({
  tabs,
  defaultValue,
  value,
  onValueChange,
  "data-testid": testId,
}: TabsBarProps) {
  return (
    <div 
      className="sticky top-16 z-30 bg-white border-b border-slate-200 px-2 py-2 -mx-6 md:-mx-8"
      data-testid={testId || "tabs-bar"}
    >
      <Tabs defaultValue={defaultValue} value={value} onValueChange={onValueChange} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-slate-50 rounded-lg">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="min-h-[48px] px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              data-testid={`tab-trigger-${tab.value}`}
              aria-label={tab.label}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent 
            key={tab.value} 
            value={tab.value}
            className="mt-6"
            data-testid={`tab-content-${tab.value}`}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
