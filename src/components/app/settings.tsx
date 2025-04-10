import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { refreshApps } from "@/store/app";
import { updateTauriTheme } from "@/lib/update-tauri-theme";
import { Switch } from "@/components/ui/switch";
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
  const [isTelemetryEnabled, setIsTelemetryEnabled] = useState(true);

  useEffect(() => {
    getVersion().then(setVersion);
    checkTelemetryStatus();
  }, []);

  const checkTelemetryStatus = async () => {
    try {
      // Get telemetry status from localStorage
      const telemetryDisabled =
        localStorage.getItem("telemetry-disabled") === "true";
      setIsTelemetryEnabled(!telemetryDisabled);
    } catch (error) {
      console.error("Failed to check telemetry status:", error);
    }
  };

  const toggleTelemetry = async (enabled: boolean) => {
    try {
      // Store telemetry preference in localStorage
      localStorage.setItem("telemetry-disabled", (!enabled).toString());
      setIsTelemetryEnabled(enabled);

      // Update window.analytics settings using Segment-compatible approach
      if (window.analytics) {
        if (!enabled) {
          // Disable tracking
          window.analytics.track = function () {};
          window.analytics.page = function () {};
          window.analytics.identify = function () {};
          window.analytics.group = function () {};

          // Set anonymousId to null
          window.analytics.user = function () {
            return {
              anonymousId: function () {
                return null;
              },
            };
          };
        } else {
          // Reload the page to re-initialize analytics
          window.location.reload();
        }
      }

      toast.success(`Anonymous telemetry ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error(
        `Failed to ${enabled ? "enable" : "disable"} telemetry:`,
        error
      );
      toast.error(`Failed to ${enabled ? "enable" : "disable"} telemetry`, {
        description: String(error),
      });
    }
  };

  const updateTheme = async (theme: string) => {
    setTheme(theme);
    await updateTauriTheme(theme);
  };

  const handleOpenLogsFolder = async () => {
    try {
      await invoke("open_logs_folder");
    } catch (error) {
      console.error("Failed to open logs folder:", error);
      toast.error("Failed to open logs folder", {
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
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Apps</label>
              <p className="text-sm text-muted-foreground">
                Manage the apps listed in Staten.ai
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshApps}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Updating..." : "Update"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenRegistry}>
                Add
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground">
                Customize your interface color scheme
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="capitalize">
                  {theme === "system"
                    ? "System"
                    : theme === "dark"
                      ? "Dark"
                      : "Light"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    void updateTheme("light");
                  }}
                >
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void updateTheme("dark");
                  }}
                >
                  Dark
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
              <label className="text-sm font-medium">Telemetry</label>
              <p className="text-sm text-muted-foreground">
                Allow anonymous usage data collection
              </p>
            </div>
            <Switch
              checked={isTelemetryEnabled}
              onCheckedChange={toggleTelemetry}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Logs</label>
              <p className="text-sm text-muted-foreground">
                Access Staten.ai logs
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenLogsFolder}>
              Open Logs
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Version</label>
              <p className="text-sm text-muted-foreground">
                Current Staten.ai version
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
