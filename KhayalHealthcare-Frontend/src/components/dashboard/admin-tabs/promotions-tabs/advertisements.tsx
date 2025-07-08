import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/types/schema";
import type { Advertisement } from "@/types/advertisement";
import { AdvertisementStatus } from "@/types/advertisement";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  ImageOff,
  Power,
  PowerOff,
  MoreVertical,
  Search,
  RotateCcw,
  XCircle,
  FileImage,
  Megaphone,
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Form validation schema
const advertisementFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(500, "Description must be less than 500 characters"),
    message: z.string().min(1, "Message is required"),
    target_role: z.nativeEnum(UserRole),
    display_order: z.number().min(0, "Display order must be 0 or greater"),
    start_date: z.date(),
    end_date: z.date(),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: "End date must be after start date",
    path: ["end_date"],
  });

type FormData = z.infer<typeof advertisementFormSchema>;

// Filter types
type FilterStatus = AdvertisementStatus | "all";

export default function AdvertisementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  const isAdmin = user?.role === UserRole.ADMIN;

  // Function to construct full image URLs
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "";

    const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");

    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      return cleanPath;
    }

    return `${API_BASE_URL}/${cleanPath}`;
  };

  const handleImageError = (adId: string) => {
    setImageErrors((prev) => new Set(prev).add(adId));
  };

  // Fetch advertisements
  const { data: advertisements = [], isLoading } = useQuery<Advertisement[]>({
    queryKey: [
      isAdmin
        ? API_ENDPOINTS.ADVERTISEMENTS_ALL
        : API_ENDPOINTS.ADVERTISEMENTS_MY_ADS,
    ],
    enabled: !!user,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AdvertisementStatus;
    }) => {
      const formData = new FormData();
      formData.append("status", status);

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADVERTISEMENT_UPDATE(id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          throw new Error(
            error.detail || "Failed to update advertisement status"
          );
        } else {
          throw new Error(
            `Failed to update advertisement status: ${response.statusText}`
          );
        }
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_MY_ADS],
      });
      toast({
        title: "Success",
        description: "Advertisement status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create advertisement mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData & { image: File }) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("message", data.message);
      formData.append("target_role", data.target_role);
      formData.append("display_order", data.display_order.toString());
      formData.append("start_date", data.start_date.toISOString());
      formData.append("end_date", data.end_date.toISOString());
      formData.append("image", data.image);

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADVERTISEMENTS_CREATE}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to create advertisement");
        } else {
          throw new Error(
            `Failed to create advertisement: ${response.statusText}`
          );
        }
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_MY_ADS],
      });
      toast({
        title: "Success",
        description: "Advertisement created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update advertisement mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FormData> & { image?: File };
    }) => {
      const formData = new FormData();
      if (data.title) formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      if (data.message) formData.append("message", data.message);
      if (data.target_role) formData.append("target_role", data.target_role);
      if (data.display_order !== undefined)
        formData.append("display_order", data.display_order.toString());
      if (data.start_date)
        formData.append("start_date", data.start_date.toISOString());
      if (data.end_date)
        formData.append("end_date", data.end_date.toISOString());
      if (data.image) formData.append("image", data.image);

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADVERTISEMENT_UPDATE(id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to update advertisement");
        } else {
          throw new Error(
            `Failed to update advertisement: ${response.statusText}`
          );
        }
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_MY_ADS],
      });
      toast({
        title: "Success",
        description: "Advertisement updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedAd(null);
      editForm.reset();
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!id) {
        throw new Error("Advertisement ID is required");
      }

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.ADVERTISEMENT_DELETE(id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 204) {
        return { success: true };
      }

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to delete advertisement");
        } else {
          throw new Error(
            `Failed to delete advertisement: ${response.statusText}`
          );
        }
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_ALL],
      });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ADVERTISEMENTS_MY_ADS],
      });
      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedAd(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for create
  const form = useForm<FormData>({
    resolver: zodResolver(advertisementFormSchema),
    defaultValues: {
      title: "",
      description: "",
      message: "",
      target_role: UserRole.SUBSCRIBER,
      display_order: 0,
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(advertisementFormSchema),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Please select a valid image file (JPEG, JPG, or PNG)",
          variant: "destructive",
        });
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = (data: FormData) => {
    if (!selectedImage) {
      toast({
        title: "Error",
        description: "Please select an image",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ ...data, image: selectedImage });
  };

  const handleEdit = (ad: Advertisement) => {
    setSelectedAd(ad);
    editForm.reset({
      title: ad.title,
      description: ad.description,
      message: ad.message,
      target_role: ad.target_role,
      display_order: ad.display_order,
      start_date: new Date(ad.start_date),
      end_date: new Date(ad.end_date),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: FormData) => {
    if (!selectedAd) return;
    updateMutation.mutate({
      id: selectedAd._id,
      data: selectedImage ? { ...data, image: selectedImage } : data,
    });
  };

  const handleDelete = (ad: Advertisement) => {
    if (!ad || !ad._id) {
      toast({
        title: "Error",
        description: "Invalid advertisement selected",
        variant: "destructive",
      });
      return;
    }
    setSelectedAd(ad);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleStatus = (ad: Advertisement) => {
    const newStatus =
      ad.status === AdvertisementStatus.ACTIVE
        ? AdvertisementStatus.INACTIVE
        : AdvertisementStatus.ACTIVE;

    toggleStatusMutation.mutate({
      id: ad._id,
      status: newStatus,
    });
  };

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterStatus("all");
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      [AdvertisementStatus.ACTIVE]:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      [AdvertisementStatus.INACTIVE]:
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800",
      [AdvertisementStatus.EXPIRED]:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800"
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case AdvertisementStatus.ACTIVE:
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case AdvertisementStatus.INACTIVE:
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case AdvertisementStatus.EXPIRED:
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default:
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      [AdvertisementStatus.ACTIVE]: "Active",
      [AdvertisementStatus.INACTIVE]: "Inactive",
      [AdvertisementStatus.EXPIRED]: "Expired",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      [UserRole.ADMIN]:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      [UserRole.SUBSCRIBER]:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      [UserRole.CHEF]:
        "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      [UserRole.PSYCHOLOGIST]:
        "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
      [UserRole.CARETAKER]:
        "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800",
    };
    return colors[role] || colors[UserRole.SUBSCRIBER];
  };

  // Calculate stats
  const adStats = useMemo(() => {
    return {
      total: advertisements.length,
      active: advertisements.filter(
        (ad) => ad.status === AdvertisementStatus.ACTIVE
      ).length,
      inactive: advertisements.filter(
        (ad) => ad.status === AdvertisementStatus.INACTIVE
      ).length,
      expired: advertisements.filter(
        (ad) => ad.status === AdvertisementStatus.EXPIRED
      ).length,
      totalViews: advertisements.reduce((sum, ad) => sum + ad.view_count, 0),
    };
  }, [advertisements]);

  // Filter advertisements
  const filteredAdvertisements = useMemo(() => {
    let filtered = advertisements;

    if (filterStatus !== "all") {
      filtered = filtered.filter((ad) => ad.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ad) => {
        return (
          ad.title.toLowerCase().includes(query) ||
          ad.description.toLowerCase().includes(query) ||
          ad.message.toLowerCase().includes(query) ||
          ad._id.toLowerCase().includes(query) ||
          ad.target_role.toLowerCase().includes(query)
        );
      });
    }

    return filtered.sort((a, b) => {
      // Sort by display order first, then by creation date
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [advertisements, filterStatus, searchQuery]);

  // Statistics cards data
  const statisticsCards = [
    {
      key: "total-ads",
      title: "Total Ads",
      value: adStats.total,
      icon: Megaphone,
      gradient:
        "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      border: "border-purple-200 dark:border-purple-700",
      textColor: "text-purple-700 dark:text-purple-300",
      valueColor: "text-purple-900 dark:text-purple-100",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "active-ads",
      title: "Active",
      value: adStats.active,
      icon: Power,
      gradient:
        "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20",
      border: "border-emerald-200 dark:border-emerald-700",
      textColor: "text-emerald-700 dark:text-emerald-300",
      valueColor: "text-emerald-900 dark:text-emerald-100",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "inactive-ads",
      title: "Inactive",
      value: adStats.inactive,
      icon: PowerOff,
      gradient:
        "from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20",
      border: "border-gray-200 dark:border-gray-700",
      textColor: "text-gray-700 dark:text-gray-300",
      valueColor: "text-gray-900 dark:text-gray-100",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
    {
      key: "expired-ads",
      title: "Expired",
      value: adStats.expired,
      icon: Calendar,
      gradient:
        "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20",
      border: "border-red-200 dark:border-red-700",
      textColor: "text-red-700 dark:text-red-300",
      valueColor: "text-red-900 dark:text-red-100",
      iconColor: "text-red-600 dark:text-red-400",
    },
    {
      key: "total-views",
      title: "Total Views",
      value: adStats.totalViews.toLocaleString(),
      icon: Eye,
      gradient:
        "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
      border: "border-blue-200 dark:border-blue-700",
      textColor: "text-blue-700 dark:text-blue-300",
      valueColor: "text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
  ];

  const renderAdvertisementCard = (ad: Advertisement, index: number) => {
    const isActive = ad.status === AdvertisementStatus.ACTIVE;
    const isExpired = ad.status === AdvertisementStatus.EXPIRED;
    const adKey = ad._id ? `ad-${ad._id}` : `ad-${index}`;

    return (
      <Card
        key={adKey}
        className={cn(
          "relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg",
          isActive && "ring-2 ring-emerald-200 dark:ring-emerald-800",
          isExpired && "opacity-75"
        )}
      >
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
          <div
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
              ad.status
            )}`}
          >
            {getStatusIcon(ad.status)}
            <span>{getStatusLabel(ad.status)}</span>
          </div>
        </div>
        {isActive && (
          <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
        )}
        {isExpired && (
          <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-red-400 to-red-500" />
        )}

        {/* Image Section */}
        <div className="aspect-video relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
          {ad.image_url && !imageErrors.has(ad._id) ? (
            <img
              src={getImageUrl(ad.image_url)}
              alt={ad.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={() => handleImageError(ad._id)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* View Count Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Eye className="h-4 w-4" />
              <span>{(ad.view_count || 0).toLocaleString()} views</span>
            </div>
          </div>
        </div>

        <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-start gap-2 sm:gap-3 pr-20 sm:pr-32">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 flex-shrink-0">
                <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {ad.title}
                </CardTitle>
                <div className="mt-0.5">
                  <code className="inline-block text-[9px] sm:text-[10px] md:text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 break-words">
                    #{ad._id}
                  </code>
                </div>
                <CardDescription className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                  {ad.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {/* Target Role */}
            <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Target Audience
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    getRoleColor(ad.target_role)
                  )}
                >
                  {ad.target_role.charAt(0).toUpperCase() +
                    ad.target_role.slice(1).toLowerCase()}
                </span>
              </div>
            </div>

            {/* Campaign Duration */}
            <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Campaign Duration
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                  {format(new Date(ad.start_date), "MMM d")} -{" "}
                  {format(new Date(ad.end_date), "MMM d, yyyy")}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="font-medium text-xs sm:text-sm mb-1.5 text-gray-900 dark:text-white">
                Message
              </p>
              <div className="flex items-start gap-1.5 sm:gap-2">
                <FileImage className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-xs sm:text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words block",
                      !expandedMessages.has(ad._id) && "line-clamp-2"
                    )}
                  >
                    {ad.message}
                  </span>
                  {ad.message.length > 100 && (
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedMessages);
                        if (expandedMessages.has(ad._id)) {
                          newExpanded.delete(ad._id);
                        } else {
                          newExpanded.add(ad._id);
                        }
                        setExpandedMessages(newExpanded);
                      }}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1"
                    >
                      {expandedMessages.has(ad._id) ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Order & Actions */}
            {isAdmin && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-muted-foreground">
                  Display Order: {ad.display_order}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleEdit(ad)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(ad)}>
                      {ad.status === AdvertisementStatus.ACTIVE ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(ad)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Dashboard */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {statisticsCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Card
                key={card.key}
                className={`bg-gradient-to-br ${card.gradient} ${card.border}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-medium ${card.textColor} truncate`}
                      >
                        {card.title}
                      </p>
                      <p
                        className={`text-xl sm:text-2xl md:text-3xl font-bold ${card.valueColor}`}
                      >
                        {card.value}
                      </p>
                    </div>
                    <IconComponent
                      className={`h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 ${card.iconColor} flex-shrink-0`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search and Filter Controls */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, message, target role, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {[
                {
                  key: "all",
                  label: "All Ads",
                  count: adStats.total,
                  color: "bg-gray-500",
                },
                {
                  key: AdvertisementStatus.ACTIVE,
                  label: "Active",
                  count: adStats.active,
                  color: "bg-emerald-500",
                },
                {
                  key: AdvertisementStatus.INACTIVE,
                  label: "Inactive",
                  count: adStats.inactive,
                  color: "bg-gray-500",
                },
                {
                  key: AdvertisementStatus.EXPIRED,
                  label: "Expired",
                  count: adStats.expired,
                  color: "bg-red-500",
                },
              ].map((filter) => (
                <Button
                  key={`filter-${filter.key}`}
                  variant={filterStatus === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(filter.key as FilterStatus)}
                  className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${filter.color}`}
                  />
                  <span className="truncate">{filter.label}</span>
                  {filter.count > 0 && (
                    <span
                      className={`px-1 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                        filterStatus === filter.key
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {filter.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
          {filterStatus === "all"
            ? "All Advertisements"
            : `${getStatusLabel(filterStatus)} Advertisements`}
        </h3>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
            {filteredAdvertisements.length}{" "}
            {filteredAdvertisements.length === 1 ? "ad" : "ads"} found
          </span>
          {isAdmin && (
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1.5" />
                  <span className="hidden sm:inline">Create Ad</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="text-base sm:text-lg">
                    Create New Advertisement
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Fill in the details to create a new advertisement that will
                    be displayed to users.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleCreate)}
                      className="space-y-4 px-6 pb-4"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Title
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter advertisement title"
                                className="h-8 sm:h-10 text-xs sm:text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter advertisement description"
                                rows={3}
                                className="resize-none text-xs sm:text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Message
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter detailed message"
                                rows={4}
                                className="resize-none text-xs sm:text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="target_role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">
                                Target Role
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                                    <SelectValue placeholder="Select target role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={UserRole.SUBSCRIBER}>
                                    Subscriber
                                  </SelectItem>
                                  <SelectItem value={UserRole.CHEF}>
                                    Chef
                                  </SelectItem>
                                  <SelectItem value={UserRole.PSYCHOLOGIST}>
                                    Psychologist
                                  </SelectItem>
                                  <SelectItem value={UserRole.CARETAKER}>
                                    Caretaker
                                  </SelectItem>
                                  <SelectItem value={UserRole.ADMIN}>
                                    Admin
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="display_order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">
                                Display Order
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 sm:h-10 text-xs sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="start_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">
                                Start Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  value={
                                    field.value
                                      ? format(field.value, "yyyy-MM-dd")
                                      : ""
                                  }
                                  onChange={(e) =>
                                    field.onChange(new Date(e.target.value))
                                  }
                                  className="h-8 sm:h-10 text-xs sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="end_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs sm:text-sm">
                                End Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  value={
                                    field.value
                                      ? format(field.value, "yyyy-MM-dd")
                                      : ""
                                  }
                                  onChange={(e) =>
                                    field.onChange(new Date(e.target.value))
                                  }
                                  className="h-8 sm:h-10 text-xs sm:text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">
                          Advertisement Image *
                        </Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                          <Input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                            required
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer"
                          >
                            {imagePreview ? (
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="max-w-full h-48 object-cover rounded-md mx-auto"
                              />
                            ) : (
                              <div className="py-8">
                                <ImageOff className="h-12 w-12 mx-auto text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">
                                  Click to upload image
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  JPEG, JPG or PNG (max 5MB)
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </form>
                  </Form>
                </div>
                <DialogFooter className="flex-shrink-0 border-t pt-4 gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      form.reset();
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={form.handleSubmit(handleCreate)}
                    disabled={createMutation.isPending}
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Advertisement"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Advertisements Grid */}
      {filteredAdvertisements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredAdvertisements.map((ad, index) =>
            renderAdvertisementCard(ad, index)
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Megaphone className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {searchQuery || filterStatus !== "all"
                    ? "No matching advertisements"
                    : "No advertisements"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : isAdmin
                    ? "Create your first advertisement to get started."
                    : "No advertisements are currently available for your role."}
                </p>
              </div>
              {(searchQuery || filterStatus !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">
              Edit Advertisement
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update the advertisement details below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(handleUpdate)}
                className="space-y-4 px-6 pb-4"
              >
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">
                        Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter advertisement title"
                          className="h-8 sm:h-10 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter advertisement description"
                          rows={3}
                          className="resize-none text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">
                        Message
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter detailed message"
                          rows={4}
                          className="resize-none text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="target_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          Target Role
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                              <SelectValue placeholder="Select target role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={UserRole.SUBSCRIBER}>
                              Subscriber
                            </SelectItem>
                            <SelectItem value={UserRole.CHEF}>Chef</SelectItem>
                            <SelectItem value={UserRole.PSYCHOLOGIST}>
                              Psychologist
                            </SelectItem>
                            <SelectItem value={UserRole.CARETAKER}>
                              Caretaker
                            </SelectItem>
                            <SelectItem value={UserRole.ADMIN}>
                              Admin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          Display Order
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                            className="h-8 sm:h-10 text-xs sm:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          Start Date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(new Date(e.target.value))
                            }
                            className="h-8 sm:h-10 text-xs sm:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          End Date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(new Date(e.target.value))
                            }
                            className="h-8 sm:h-10 text-xs sm:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">
                    Advertisement Image (Optional)
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload-edit"
                    />
                    <label
                      htmlFor="image-upload-edit"
                      className="cursor-pointer"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full h-48 object-cover rounded-md mx-auto"
                        />
                      ) : selectedAd?.image_url ? (
                        <div>
                          <img
                            src={getImageUrl(selectedAd.image_url)}
                            alt="Current"
                            className="max-w-full h-48 object-cover rounded-md mx-auto"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <p className="text-sm text-gray-600 mt-2">
                            Click to change image
                          </p>
                        </div>
                      ) : (
                        <div className="py-8">
                          <ImageOff className="h-12 w-12 mx-auto text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            Click to upload new image
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            JPEG, JPG or PNG (max 5MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </form>
            </Form>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                editForm.reset();
                setSelectedImage(null);
                setImagePreview(null);
                setSelectedAd(null);
              }}
              className="h-8 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={editForm.handleSubmit(handleUpdate)}
              disabled={updateMutation.isPending}
              className="h-8 sm:h-10 text-xs sm:text-sm"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Advertisement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Delete Advertisement
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete "{selectedAd?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedAd(null);
              }}
              className="h-8 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedAd && deleteMutation.mutate(selectedAd._id)
              }
              disabled={deleteMutation.isPending}
              className="h-8 sm:h-10 text-xs sm:text-sm"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
