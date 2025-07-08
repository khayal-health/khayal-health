import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contact, MessageSquare } from "lucide-react";
import { CareRequestsService } from "./care-service-tabs/care-requests.service";
import { CounsellingRequestsService } from "./care-service-tabs/counselling-requests.service";

export class CareService {
  private careRequestsService: CareRequestsService;
  private counsellingRequestsService: CounsellingRequestsService;

  constructor(user: any) {
    this.careRequestsService = new CareRequestsService(user);
    this.counsellingRequestsService = new CounsellingRequestsService(user);
  }

  Component = () => {
    return (
      <div className="space-y-6">
        {/* Updated Tabs with grid-cols-2 for 2 tabs */}
        <Tabs defaultValue="counseling" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 gap-2 p-1 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="counseling"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">Counseling</span>
            </TabsTrigger>
            <TabsTrigger
              value="careVisits"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Contact className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">
                Care Visits
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Counseling Tab */}
          <TabsContent value="counseling" className="mt-0">
            <this.counsellingRequestsService.Component />
          </TabsContent>

          {/* Care Visits Tab */}
          <TabsContent value="careVisits" className="mt-0">
            <this.careRequestsService.Component />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
}
