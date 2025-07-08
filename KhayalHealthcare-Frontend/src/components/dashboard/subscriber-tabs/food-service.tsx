import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, Package } from "lucide-react";
import { ChefMenuComponent } from "./chef-service-tabs/ChefMenuComponent";
import { OrdersComponent } from "./chef-service-tabs/OrdersComponent";

export class FoodService {
  private user: any;

  constructor(user: any) {
    this.user = user;
  }

  Component = () => {
    return (
      <div className="space-y-6">
        {/* Updated Tabs to match main navigation style */}
        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 gap-2 p-1 h-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="menu"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ScrollText className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">Menu</span>
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 sm:py-4 px-3 sm:px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Package className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">Orders</span>
            </TabsTrigger>
          </TabsList>

          {/* Chef Menu Tab */}
          <TabsContent value="menu" className="mt-0">
            <ChefMenuComponent user={this.user} />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-0">
            <OrdersComponent user={this.user} />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
}
