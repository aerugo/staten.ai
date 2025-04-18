import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@tanstack/react-store";
import { useApps } from "@/appRegistry";
import { AppListItem } from "@/components/app/AppListItem";
import { Loader } from "@/components/ui/loader";
import { appStore, updateAppInstallation } from "@/store/app";

export function Home() {
  const appStatuses = useStore(appStore, (state) => state.appStatuses);
  const isLoadingStatuses = useStore(
    appStore,
    (state) => state.isLoadingStatuses
  );
  const { apps, isLoading: isLoadingApps } = useApps();

  useEffect(() => {
    if (!appStatuses) return;

    const timer = setTimeout(() => {
      invoke("log_from_frontend", {
        level: "info",
        message: `App statuses: ${JSON.stringify(appStatuses)}`,
      }).catch((error) => {
        console.error("Failed to log app statuses:", error);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [appStatuses]);

  const handleInstallationChange = (appName: string, isInstalled: boolean) => {
    updateAppInstallation(appName, isInstalled);
  };

  if (isLoadingStatuses || isLoadingApps || !appStatuses) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="text-gray-800 dark:text-gray-200" />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Appar
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-row-8 gap-x-5">
        {apps.map((app) => (
          <AppListItem
            key={app.name}
            app={app}
            isConfigured={appStatuses.configured[app.name] ?? false}
            isInstalled={appStatuses.installed[app.name] ?? false}
            onAppSelect={() => {}}
            onInstallationChange={(isInstalled) =>
              handleInstallationChange(app.name, isInstalled)
            }
          />
        ))}
      </div>
    </section>
  );
}
