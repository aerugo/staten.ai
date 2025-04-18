import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { clientIconMap, ClientType, ClientTypeLabels } from "@/types/clients";
import { loadApps, loadAppStatuses } from "@/store/app";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ClientSelector({
  currentClient,
  onClientChange,
}: {
  currentClient: ClientType;
  onClientChange: (client: ClientType) => void;
}) {
  const [clientInstallStatus, setClientInstallStatus] = useState<
    Record<ClientType, boolean>
  >({} as Record<ClientType, boolean>);

  useEffect(() => {
    const refreshAppState = async () => {
      try {
        await loadAppStatuses(currentClient);
        await loadApps();
      } catch (error) {
        console.error("Failed to refresh app state:", error);
      }
    };

    refreshAppState();
  }, [currentClient]);

  useEffect(() => {
    const checkAllClientsInstallation = async () => {
      const statuses: Record<ClientType, boolean> = {} as Record<
        ClientType,
        boolean
      >;
      for (const client of Object.values(ClientType)) {
        const result = await invoke("check_client_installed", {
          client: client.toString(),
        });
        statuses[client] = result as boolean;
      }
      setClientInstallStatus(statuses);
    };

    checkAllClientsInstallation();
  }, [currentClient]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between text-xs h-8 px-2">
          <img
            src={clientIconMap[currentClient]}
            alt={ClientTypeLabels[currentClient]}
            className="w-4 h-4"
          />
          {ClientTypeLabels[currentClient]}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {Object.values(ClientType).map((client) => (
          <TooltipProvider key={client}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DropdownMenuItem
                    onClick={() => {
                      onClientChange(client);
                    }}
                    disabled={!clientInstallStatus[client]}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <img
                        src={clientIconMap[client]}
                        alt={ClientTypeLabels[client]}
                        className="w-4 h-4"
                      />
                      {ClientTypeLabels[client]}
                    </div>
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>
              {!clientInstallStatus[client] && (
                <TooltipContent
                  side="right"
                  align="start"
                  className="ml-1 max-w-[200px]"
                >
                  <p>{ClientTypeLabels[client]} är inte installerad.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
