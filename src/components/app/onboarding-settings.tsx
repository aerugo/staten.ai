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
  const [isStatenEnabled, setIsStatenEnabled] = useState(false);
  const [isStatenToggling, setIsStatenToggling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { currentClient } = useStore(appStore, (state) => ({
    currentClient: state.currentClient,
  }));

  useEffect(() => {
    checkStatenStatus();
  }, []);

  const checkStatenStatus = async () => {
    try {
      const statuses = await invoke<{ installed: Record<string, boolean> }>(
        "get_app_statuses"
      );
      setIsStatenEnabled(!!statuses.installed.staten);
    } catch (error) {
      console.error("Misslyckades med att hämta Staten-status:", error);
    }
  };

  const toggleStaten = async (enabled: boolean) => {
    setIsStatenToggling(true);
    try {
      if (enabled) {
        await invoke("install_staten_mcp", { client: currentClient });
        toast.success("Aktiverade Staten onboarding");
      } else {
        await invoke("uninstall_staten_mcp", { client: currentClient });
        toast.success("Avaktiverade Staten onboarding");
      }
      setIsStatenEnabled(enabled);
    } catch (error) {
      console.error(
        `Misslyckades med att ${
          enabled ? "aktivera" : "avaktivera"
        } Staten onboarding:`,
        error
      );
      toast.error(
        `Misslyckades med att ${
          enabled ? "aktivera" : "avaktivera"
        } Staten onboarding`,
        {
          description: String(error),
        }
      );
    } finally {
      setIsStatenToggling(false);
    }
  };

  const resetOnboarding = async () => {
    setIsResetting(true);
    try {
      resetOnboardingStatus();
      await invoke("reset_onboarding_completed");
      toast.success("Onboarding återställd");
      window.location.reload();
    } catch (error) {
      console.error("Misslyckades med att återställa onboarding:", error);
      toast.error("Misslyckades med att återställa onboarding", {
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
            Aktivera onboarding för Staten AI i Claude
          </p>
        </div>
        <Switch
          checked={isStatenEnabled}
          disabled={isStatenToggling}
          onCheckedChange={toggleStaten}
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Återställ onboarding</label>
          <p className="text-sm text-muted-foreground">
            Börja om onboarding-processen för Staten AI i Claude
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={resetOnboarding}
          disabled={isResetting}
        >
          {isResetting ? "Återställer..." : "Återställ"}
        </Button>
      </div>
    </div>
  );
}
