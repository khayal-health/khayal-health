import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";

type Appointment = {
  _id: string;
  dateTime: string;
  psychologist?: { name: string };
  notes: string;
};

const formatDate = (
  dateValue: string | null | undefined,
  formatString: string = "PPP"
): string => {
  if (!dateValue) return "Date not available";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return format(date, formatString);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
};

export class AppointmentsService {
  private user: any;

  constructor(user: any) {
    this.user = user;
  }

  Component = () => {
    const { data: appointments = [], isLoading: appointmentsLoading } =
      useQuery<Appointment[]>({
        queryKey: [API_ENDPOINTS.APPOINTMENTS_SUBSCRIBER(this.user!._id)],
        queryFn: getQueryFn({ on401: "returnNull" }),
        select: (data) => {
          if (!data || !Array.isArray(data)) return [];
          return data.filter(
            (appointment) => appointment && typeof appointment === "object"
          );
        },
      });

    if (appointmentsLoading) {
      return (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Appointments</CardTitle>
          <CardDescription>
            Upcoming and past appointments with healthcare providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Psychologist</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments?.map((appointment: Appointment) => (
                <TableRow key={`appointment-${appointment._id}`}>
                  <TableCell>
                    {formatDate(appointment.dateTime, "PPp")}
                  </TableCell>
                  <TableCell>
                    {appointment.psychologist?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{appointment.notes || "No notes yet"}</TableCell>
                </TableRow>
              ))}
              {appointments.length === 0 && (
                <TableRow key="appointments-empty-state">
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    No appointments scheduled
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };
}
