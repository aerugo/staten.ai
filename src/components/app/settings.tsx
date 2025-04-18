import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { refreshApps } from "@/store/app";
import { updateTauriTheme } from "@/lib/update-tauri-theme";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OnboardingSettings } from "./onboarding-settings";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [version, setVersion] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  const updateTheme = async (theme: string) => {
    setTheme(theme);
    await updateTauriTheme(theme);
  };

  const handleOpenLogsFolder = async () => {
    try {
      await invoke("open_logs_folder");
    } catch (error) {
      console.error("Kunde inte öppna loggmappen:", error);
      toast.error("Kunde inte öppna loggmappen", {
        description: String(error),
      });
    }
  };

  const handleOpenRegistry = async () => {
    await openUrl(
      "https://github.com/aerugo/staten.ai-app-registry?tab=readme-ov-file#contributing-your-mcp"
    );
  };

  const handleRefreshApps = async () => {
    try {
      setIsRefreshing(true);
      await refreshApps();
    } catch (error) {
      console.error("Failed to refresh apps:", error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <img src="/icons/cog.svg" className="h-4 w-4" />
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inställningar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Apps</label>
              <p className="text-sm text-muted-foreground">
                Hantera appbiblioteket
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshApps}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Uppdaterar..." : "Uppdatera"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenRegistry}>
                Lägg till app
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground">Ändra appens tema</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="capitalize">
                  {theme === "system"
                    ? "System"
                    : theme === "dark"
                      ? "Mörkt"
                      : "Ljust"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    void updateTheme("light");
                  }}
                >
                  Ljust
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void updateTheme("dark");
                  }}
                >
                  Mörkt
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void updateTheme("system");
                  }}
                >
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Separator />
          <OnboardingSettings />
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Logs</label>
              <p className="text-sm text-muted-foreground">
                Öppna Statens loggmapp
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenLogsFolder}>
              Öppna loggmapp
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Version</label>
              <p className="text-sm text-muted-foreground">
                Version av Staten.ai
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm font-mono">{version}</span>
              <div></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
