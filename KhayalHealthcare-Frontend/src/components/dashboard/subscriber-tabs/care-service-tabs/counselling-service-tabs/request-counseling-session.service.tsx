import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Brain,
  CalendarDays,
  Clock,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ENDPOINTS } from "@/lib/config";
import { cn } from "@/lib/utils";

const insertPsychologistVisitRequestSchema = z.object({
  subscriber_id: z.string(),
  request_type: z.enum(["self", "psychologist"]).default("self"),
  description: z.string().min(1, "Description is required"),
  preferred_date: z.string(),
});

export class RequestCounselingSessionService {
  private user: any;
  private onSuccessCallback?: () => void;

  constructor(user: any, onSuccessCallback?: () => void) {
    this.user = user;
    this.onSuccessCallback = onSuccessCallback;
  }

  Component = () => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<z.infer<
      typeof insertPsychologistVisitRequestSchema
    > | null>(null);

    const psychForm = useForm<
      z.infer<typeof insertPsychologistVisitRequestSchema>
    >({
      resolver: zodResolver(insertPsychologistVisitRequestSchema),
      defaultValues: {
        subscriber_id: this.user!._id,
        request_type: "self",
        description: "",
        preferred_date: new Date().toISOString(),
      },
    });

    const createPsychRequestMutation = useMutation({
      mutationFn: async (
        data: z.infer<typeof insertPsychologistVisitRequestSchema>
      ) => {
        const res = await apiRequest(
          "POST",
          API_ENDPOINTS.VISIT_REQUESTS_PSYCHOLOGIST,
          data
        );
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            API_ENDPOINTS.VISIT_REQUESTS_PSYCHOLOGIST_SUBSCRIBER(
              this.user!._id
            ),
          ],
        });

        toast({
          title: "✅ Session Request Submitted Successfully",
          description:
            "We'll contact you within 24 hours to confirm your counseling session",
        });

        // Close confirmation dialog
        setShowConfirmation(false);
        setPendingFormData(null);

        // Reset form
        psychForm.reset({
          subscriber_id: this.user!._id,
          request_type: "self",
          description: "",
          preferred_date: new Date().toISOString(),
        });

        // Call the success callback if provided
        if (this.onSuccessCallback) {
          this.onSuccessCallback();
        }
      },
      onError: (error: Error) => {
        toast({
          title: "❌ Unable to Submit Request",
          description: error.message,
          variant: "destructive",
        });
        setShowConfirmation(false);
        setPendingFormData(null);
      },
    });

    const handleFormSubmit = (
      event: React.FormEvent,
      data: z.infer<typeof insertPsychologistVisitRequestSchema>
    ) => {
      // Prevent any default form submission behavior
      event.preventDefault();
      event.stopPropagation();

      setPendingFormData(data);
      setShowConfirmation(true);
    };

    const handleConfirmSubmit = (event: React.MouseEvent) => {
      // Prevent any default behavior
      event.preventDefault();
      event.stopPropagation();

      if (pendingFormData) {
        createPsychRequestMutation.mutate(pendingFormData);
      }
    };

    const handleCancelConfirmation = () => {
      setShowConfirmation(false);
      setPendingFormData(null);
    };

    const formatDateTime = (dateString: string) => {
      return new Date(dateString).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return (
      <div className="w-full p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Request Counseling Session
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Schedule a session with a licensed psychologist
            </p>
          </div>

          {/* Main Form Card */}
          <Card
            className={cn(
              "relative overflow-hidden border border-gray-200 dark:border-gray-800",
              "bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg"
            )}
          >
            <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />

            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-800/20 flex-shrink-0">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                    Session Details
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs text-muted-foreground">
                    Provide your preferred date and describe your concerns
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <Form {...psychForm}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    psychForm.handleSubmit((data) => handleFormSubmit(e, data))(
                      e
                    );
                  }}
                  className="space-y-3 sm:space-y-4 md:space-y-6"
                >
                  {/* Date Input */}
                  <FormField
                    control={psychForm.control}
                    name="preferred_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span>Preferred Session Date & Time</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="datetime-local"
                              value={
                                field.value
                                  ? new Date(field.value)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  new Date(e.target.value).toISOString()
                                )
                              }
                              className="w-full h-8 sm:h-10 text-xs sm:text-sm border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-md pl-8 sm:pl-10"
                            />
                            <Clock className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px] sm:text-xs mt-1" />
                      </FormItem>
                    )}
                  />

                  {/* Description Input */}
                  <FormField
                    control={psychForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span>Initial Concerns</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your concerns or reasons for seeking counseling. This will help our psychologist prepare for your session..."
                            rows={4}
                            className="w-full text-xs sm:text-sm resize-none border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-2 sm:p-3"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] sm:text-xs mt-1" />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={createPsychRequestMutation.isPending}
                    className={cn(
                      "w-full h-9 sm:h-10 md:h-11",
                      "bg-gradient-to-r from-purple-600 to-indigo-600",
                      "hover:from-purple-700 hover:to-indigo-700",
                      "disabled:from-purple-400 disabled:to-indigo-400",
                      "text-white font-medium rounded-md",
                      "transition-all duration-200",
                      "text-xs sm:text-sm"
                    )}
                  >
                    {createPsychRequestMutation.isPending ? (
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      "Review & Submit Request"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Footer Info */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      A counseling coordinator will contact you within 24 hours
                      to confirm your session
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Confirmation Dialog */}
        <Dialog
          open={showConfirmation}
          onOpenChange={(open) => {
            if (!createPsychRequestMutation.isPending) {
              setShowConfirmation(open);
              if (!open) {
                setPendingFormData(null);
              }
            }
          }}
        >
          <DialogContent className="w-[95vw] max-w-md mx-auto rounded-lg">
            <DialogHeader className="text-center sm:text-left">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                Confirm Your Counseling Request
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2">
                Please review your counseling session details before submitting.
              </DialogDescription>
            </DialogHeader>

            {pendingFormData && (
              <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-800/20 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                    Preferred Session Date & Time
                  </h4>
                  <p className="text-purple-800 dark:text-purple-200 text-xs sm:text-sm">
                    {formatDateTime(pendingFormData.preferred_date)}
                  </p>
                </div>

                {pendingFormData.description && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      Initial Concerns
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                      {pendingFormData.description}
                    </p>
                  </div>
                )}

                <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 sm:p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-800 dark:text-amber-200 text-[10px] sm:text-xs">
                      <span className="font-semibold">Note:</span> This request
                      will be sent to our counseling team for review and
                      scheduling.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleCancelConfirmation}
                disabled={createPsychRequestMutation.isPending}
                className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                disabled={createPsychRequestMutation.isPending}
                className={cn(
                  "w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm",
                  "bg-gradient-to-r from-emerald-600 to-green-600",
                  "hover:from-emerald-700 hover:to-green-700",
                  "disabled:from-emerald-400 disabled:to-green-400"
                )}
              >
                {createPsychRequestMutation.isPending ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                    Confirm & Submit
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
}
