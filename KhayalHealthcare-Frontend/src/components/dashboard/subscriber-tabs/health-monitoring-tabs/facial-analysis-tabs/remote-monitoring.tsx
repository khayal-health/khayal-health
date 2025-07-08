import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import RemotePPG from "../remote-ppg/remote-ppg";
import { API_ENDPOINTS } from "@/lib/config";

export class RemoteMonitoring {
  private user: any;

  constructor(user: any) {
    this.user = user;
  }

  private handleVitalsRecorded = (vitals: any) => {
    queryClient.invalidateQueries({
      queryKey: [API_ENDPOINTS.VITALS(this.user!._id)],
    });
    queryClient.invalidateQueries({
      queryKey: [API_ENDPOINTS.VITALS_SELF(this.user!._id)],
    });
    toast({
      title: "Success",
      description: "Vitals recorded successfully using facial analysis",
    });
  };

  Component = () => {
    return (
      <>
        <RemotePPG
          userId={this.user!._id}
          onVitalsRecorded={this.handleVitalsRecorded}
        />
      </>
    );
  };
}
