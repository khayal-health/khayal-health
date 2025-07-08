import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Utensils, ShoppingBag } from "lucide-react";
import ChefDetails from "./chef-managment-tabs/ChefDetails";
import ChefMenus from "./chef-managment-tabs/ChefMenus";
import ChefOrders from "./chef-managment-tabs/ChefOrders";

export default function ChefManagement() {
  const [selectedTab, setSelectedTab] = useState<string>("details");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3 gap-0 p-0 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <TabsTrigger
            value="details"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 rounded-l-xl"
          >
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Chef Details
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="menus"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
          >
            <Utensils className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Menus
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 rounded-r-xl"
          >
            <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
              Orders
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="details"
          className="mt-4 sm:mt-6 focus:outline-none"
        >
          <ChefDetails
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </TabsContent>

        <TabsContent value="menus" className="mt-4 sm:mt-6 focus:outline-none">
          <ChefMenus
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4 sm:mt-6 focus:outline-none">
          <ChefOrders
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
