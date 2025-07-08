import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, CreditCard, Ticket } from "lucide-react";
import AdvertisementsPage from "./promotions-tabs/advertisements";
import CouponManagement from "./promotions-tabs/coupon";
import SubscriptionPlansManagement from "./promotions-tabs/subscription-plan";

type TabValue = "ads" | "subscription" | "coupon";

export default function ContentManagementTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>("ads");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <TabsTrigger
            value="ads"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 rounded-l-xl"
          >
            <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Ads
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
          >
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Subscription
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="coupon"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 rounded-r-xl"
          >
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Coupon
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="mt-4 sm:mt-6 focus:outline-none">
          <AdvertisementsPage />
        </TabsContent>

        <TabsContent
          value="subscription"
          className="mt-4 sm:mt-6 focus:outline-none"
        >
          <SubscriptionPlansManagement />
        </TabsContent>

        <TabsContent value="coupon" className="mt-4 sm:mt-6 focus:outline-none">
          <CouponManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
