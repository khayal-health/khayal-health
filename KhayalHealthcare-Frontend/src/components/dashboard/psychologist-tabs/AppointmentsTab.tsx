import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@/types/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CalendarPlus, FileEdit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";

interface Subscriber {
  id: number;
  name: string;
}

interface Appointment {
  id: number;
  dateTime: string;
  subscriberId: number | null;
  notes: string | null;
  psychologistId: number;
}

type AppointmentFormData = z.infer<typeof insertAppointmentSchema>;

class AppointmentsTabController {
  private user: any;
  private toast: any;

  constructor(user: any, toast: any) {
    this.user = user;
    this.toast = toast;
  }

  createAppointmentMutation() {
    return useMutation({
      mutationFn: async (data: AppointmentFormData) => {
        const formattedData = {
          ...data,
          dateTime: new Date(data.dateTime).toISOString(),
        };
        const res = await apiRequest(
          "POST",
          API_ENDPOINTS.APPOINTMENTS_CREATE,
          formattedData
        );
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [API_ENDPOINTS.APPOINTMENTS_PSYCHOLOGIST(this.user._id)],
        });
        this.toast({
          title: "Success",
          description: "Appointment slot created successfully",
        });
      },
      onError: (error: Error) => {
        this.toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  updateNotesMutation() {
    return useMutation({
      mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
        const res = await apiRequest(
          "PATCH",
          API_ENDPOINTS.APPOINTMENT_NOTES(id),
          { notes }
        );
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [API_ENDPOINTS.APPOINTMENTS_PSYCHOLOGIST(this.user._id)],
        });
        this.toast({
          title: "Success",
          description: "Session notes updated successfully",
        });
      },
      onError: (error: Error) => {
        this.toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }
}

export default function AppointmentsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    number | null
  >(null);

  const controller = new AppointmentsTabController(user, toast);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: [API_ENDPOINTS.APPOINTMENTS_PSYCHOLOGIST(user!._id)],
  });

  const { data: subscribers = [], isLoading: subscribersLoading } = useQuery<
    Subscriber[]
  >({
    queryKey: [API_ENDPOINTS.SUBSCRIBERS],
  });

  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      psychologistId: user!._id,
      dateTime: "",
      subscriberId: undefined,
      notes: "",
    },
  });

  const notesForm = useForm({
    defaultValues: {
      notes: "",
    },
  });

  const createAppointmentMutation = controller.createAppointmentMutation();
  const updateNotesMutation = controller.updateNotesMutation();

  const handleCreateAppointment = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
    appointmentForm.reset({
      psychologistId: user!._id,
      dateTime: "",
      subscriberId: undefined,
      notes: "",
    });
  };

  const handleUpdateNotes = (data: { notes: string }) => {
    updateNotesMutation.mutate({
      id: selectedAppointmentId!,
      notes: data.notes,
    });
    notesForm.reset();
    setSelectedAppointmentId(null);
  };

  if (isLoading || subscribersLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Available Slot Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create Available Slot</CardTitle>
          <CardDescription>
            Add new time slots for patient appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...appointmentForm}>
            <form
              onSubmit={appointmentForm.handleSubmit(handleCreateAppointment)}
              className="space-y-4"
            >
              <FormField
                control={appointmentForm.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date and Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={appointmentForm.control}
                name="subscriberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Patient (Optional)</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) =>
                        field.onChange(val ? parseInt(val, 10) : undefined)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subscribers?.map((subscriber: Subscriber) => (
                          <SelectItem
                            key={subscriber.id}
                            value={String(subscriber.id)}
                          >
                            {subscriber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Create Slot
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Upcoming Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>
            View and manage your scheduled appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments?.map((appointment: Appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {format(new Date(appointment.dateTime), "PPp")}
                  </TableCell>
                  <TableCell>
                    {appointment.subscriberId
                      ? subscribers?.find(
                          (s: Subscriber) => s.id === appointment.subscriberId
                        )?.name || `Patient #${appointment.subscriberId}`
                      : "Unbooked"}
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {appointment.notes || "No notes"}
                  </TableCell>
                  <TableCell>
                    {appointment.subscriberId && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAppointmentId(appointment.id);
                              notesForm.setValue(
                                "notes",
                                appointment.notes || ""
                              );
                            }}
                          >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Add Notes
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Session Notes</DialogTitle>
                          </DialogHeader>
                          <Form {...notesForm}>
                            <form
                              onSubmit={notesForm.handleSubmit(
                                handleUpdateNotes
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={notesForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={5} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="submit"
                                className="w-full"
                                disabled={updateNotesMutation.isPending}
                              >
                                {updateNotesMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save Notes"
                                )}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
