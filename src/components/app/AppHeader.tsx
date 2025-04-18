import { App } from "@/types/components/app";
import { AppInstallButton } from "./AppInstallButton";
import { AppIcon } from "./AppIcon";
import { TextMarkdown } from "./TextMarkdown";

interface AppHeaderProps {
  app: App;
  isConfigured: boolean;
  isInstalled: boolean;
  onInstallationChange: (isInstalled: boolean) => void;
}

export function AppHeader({
  app,
  isConfigured,
  isInstalled,
  onInstallationChange,
}: AppHeaderProps) {
  return (
    <>
      <div className="pt-8 pb-6">
        <div className="flex gap-6">
          {/* App Icon */}
          <div className="relative w-24 h-24 rounded-[2rem] overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-sm">
            <AppIcon app={app} />
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0 h-full flex flex-col justify-between">
            <div className="flex items-start h-full justify-between">
              <div>
                <h1 className="text-[2rem] font-semibold leading-tight text-gray-900 dark:text-gray-100 mb-1">
                  {app.name}
                </h1>
              </div>
              <div className="ml-6 mt-2">
                <AppInstallButton
                  app={app}
                  isConfigured={isConfigured}
                  isInstalled={isInstalled}
                  onInstallationChange={onInstallationChange}
                />
              </div>
            </div>
            <div className="flex gap-6 mt-2">
              <div className="flex flex-col">
                <p className="text-xs text-gray-500 dark:text-gray-100">
                  Category
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-400">
                  {app.category}
                </p>
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-gray-500 dark:text-gray-100">
                  Source
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-400">
                  <a
                    href={app.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Github
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <TextMarkdown
            text={app.description}
            className="text-gray-600 dark:text-gray-100"
          />
        </div>
      </div>
    </>
  );
}
