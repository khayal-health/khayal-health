import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/schema";
import { KhayalLogo } from "@/components/ui/logo";
import { useIsMobile } from "@/hooks/use-mobile";
import SubscriberView from "@/components/dashboard/subscriber-view-new";
import CaretakerView from "@/components/dashboard/caretaker-view";
import ChefView from "@/components/dashboard/chef-view";
import PsychologistView from "@/components/dashboard/psychologist-view";
import AdminView from "@/components/dashboard/admin-view";
import { ChangePasswordDialog } from "@/components/ui/change-password-dialog";
import {
  LogOut,
  Share2,
  Menu,
  X,
  Lock,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const DashboardView = {
    [UserRole.ADMIN]: AdminView,
    [UserRole.SUBSCRIBER]: SubscriberView,
    [UserRole.CARETAKER]: CaretakerView,
    [UserRole.CHEF]: ChefView,
    [UserRole.PSYCHOLOGIST]: PsychologistView,
  }[user!.role];

  const handleShare = async () => {
    const shareData = {
      title: "Khayal Health",
      text: "Join Khayal Health - Your comprehensive healthcare management platform",
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Success",
          description: "Thanks for sharing Khayal Health!",
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast({
          title: "Link Copied!",
          description:
            "Share the link with your friends to invite them to Khayal Health",
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
      toast({
        title: "Error",
        description: "Could not share at this time. Please try again.",
        variant: "destructive",
      });
    }
    setMobileMenuOpen(false);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      [UserRole.ADMIN]: "bg-purple-100 text-purple-800 border-purple-200",
      [UserRole.SUBSCRIBER]: "bg-blue-100 text-blue-800 border-blue-200",
      [UserRole.CARETAKER]: "bg-green-100 text-green-800 border-green-200",
      [UserRole.CHEF]: "bg-orange-100 text-orange-800 border-orange-200",
      [UserRole.PSYCHOLOGIST]: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile and Tablet Layout */}
          {isMobile ? (
            <div ref={menuRef}>
              <div className="h-16 flex items-center justify-between">
                {/* Left: Logo and Brand */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                    <KhayalLogo size="sm" animated={false} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Khayal Health
                    </h1>
                    <p className="text-xs text-gray-500 -mt-0.5">
                      Healthcare Platform
                    </p>
                  </div>
                </div>

                {/* Right: Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="h-10 w-10 rounded-xl hover:bg-gray-100 transition-all duration-200"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-700" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-700" />
                  )}
                </Button>
              </div>

              {/* Mobile Menu Dropdown */}
              {mobileMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-lg border-b shadow-2xl z-50 rounded-b-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-5 space-y-4">
                    {/* User Info */}
                    <div className="py-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user!.username}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {getUserInitials(user!.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-lg">
                            {user!.name}
                          </p>
                          <div className="mt-1">
                            <span className={cn(
                              "inline-block px-3 py-1 text-xs font-medium rounded-full capitalize border",
                              getRoleColor(user!.role)
                            )}>
                              {user!.role.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          setChangePasswordOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start h-11 rounded-xl border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                      >
                        <Lock className="h-4 w-4 mr-3" />
                        Change Password
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={handleShare}
                        className="w-full justify-start h-11 rounded-xl border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                      >
                        <Share2 className="h-4 w-4 mr-3" />
                        Share Khayal Health
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          logoutMutation.mutate();
                          setMobileMenuOpen(false);
                        }}
                        disabled={logoutMutation.isPending}
                        className="w-full justify-start h-11 rounded-xl border-gray-300 hover:border-red-400 hover:bg-red-50 transition-all duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        {logoutMutation.isPending ? "Logging out..." : "Logout"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Layout */
            <div className="h-20 flex items-center justify-between">
              {/* Left: Logo and Brand */}
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-inner">
                  <KhayalLogo size="md" animated={false} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Khayal Health
                  </h1>
                  <p className="text-sm text-gray-500">
                    Your Complete Healthcare Platform
                  </p>
                </div>
              </div>

              {/* Right: User info and actions */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleShare}
                  className="h-10 px-5 rounded-xl shadow-sm border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-gray-100 group-hover:ring-gray-200 transition-all duration-200">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user!.username}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {getUserInitials(user!.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">
                            {user!.name}
                          </p>
                          <span className={cn(
                            "inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize border",
                            getRoleColor(user!.role)
                          )}>
                            {user!.role.toLowerCase()}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-xl shadow-lg border-gray-200 mt-2"
                  >
                    <DropdownMenuLabel className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user!.username}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                            {getUserInitials(user!.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user!.name}</p>
                          <p className="text-xs text-gray-500">@{user!.username}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setChangePasswordOpen(true)}
                      className="cursor-pointer rounded-lg mx-1"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg mx-1"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <DashboardView />
      </main>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
}
