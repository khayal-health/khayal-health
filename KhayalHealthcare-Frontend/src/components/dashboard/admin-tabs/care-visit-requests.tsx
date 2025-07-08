import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Brain } from "lucide-react";
import CaretakerRequestsTab from "./request-management-tabs/caretaker-requests-tab";
import PsychologistRequestsTab from "./request-management-tabs/psychologist-requests-tab";

type TabValue = "caretakers" | "psychologists";

export default function CareVisitRequests() {
  const [activeTab, setActiveTab] = useState<TabValue>("caretakers");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <TabsTrigger
            value="caretakers"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 rounded-l-xl"
          >
            <Heart className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Caretakers
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="psychologists"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 rounded-r-xl"
          >
            <Brain className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Psychologists
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="caretakers"
          className="mt-4 sm:mt-6 focus:outline-none"
        >
          <CaretakerRequestsTab isActive={activeTab === "caretakers"} />
        </TabsContent>

        <TabsContent
          value="psychologists"
          className="mt-4 sm:mt-6 focus:outline-none"
        >
          <PsychologistRequestsTab isActive={activeTab === "psychologists"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
