import { toast } from "sonner";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@tanstack/react-store";
import { appStore } from "@/store/app";
import { resetOnboardingStatus } from "@/lib/onboarding";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export function OnboardingSettings() {
  const [isFleurEnabled, setIsFleurEnabled] = useState(false);
  const [isFleurToggling, setIsFleurToggling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { currentClient } = useStore(appStore, (state) => ({
    currentClient: state.currentClient,
  }));

  useEffect(() => {
    checkFleurStatus();
  }, []);

  const checkFleurStatus = async () => {
    try {
      const statuses = await invoke<{ installed: Record<string, boolean> }>(
        "get_app_statuses"
      );
      setIsFleurEnabled(!!statuses.installed.fleur);
    } catch (error) {
      console.error("Failed to check Fleur status:", error);
    }
  };

  const toggleFleur = async (enabled: boolean) => {
    setIsFleurToggling(true);
    try {
      if (enabled) {
        await invoke("install_fleur_mcp", { client: currentClient });
        toast.success("Staten onboarding enabled");
      } else {
        await invoke("uninstall_fleur_mcp", { client: currentClient });
        toast.success("Staten onboarding disabled");
      }
      setIsFleurEnabled(enabled);
    } catch (error) {
      console.error(
        `Failed to ${enabled ? "install" : "uninstall"} Staten MCP:`,
        error
      );
      toast.error(
        `Failed to ${enabled ? "enable" : "disable"} Staten onboarding`,
        {
          description: String(error),
        }
      );
    } finally {
      setIsFleurToggling(false);
    }
  };

  const resetOnboarding = async () => {
    setIsResetting(true);
    try {
      resetOnboardingStatus();
      await invoke("reset_onboarding_completed");
      toast.success("Onboarding has been reset");
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset onboarding:", error);
      toast.error("Failed to reset onboarding", {
        description: String(error),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Onboarding</label>
          <p className="text-sm text-muted-foreground">
            Enable Staten.ai onboarding in Claude
          </p>
        </div>
        <Switch
          checked={isFleurEnabled}
          disabled={isFleurToggling}
          onCheckedChange={toggleFleur}
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Reset Onboarding</label>
          <p className="text-sm text-muted-foreground">
            Reset the onboarding process to start over
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={resetOnboarding}
          disabled={isResetting}
        >
          {isResetting ? "Resetting..." : "Reset"}
        </Button>
      </div>
    </div>
  );
}
