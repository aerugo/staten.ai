import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@tanstack/react-store";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { appStore } from "@/store/app";
import { cn } from "@/lib/utils";
import InstallMcpUI from "./InstallMcp";
import { DragRegion } from "../ui/drag-region";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { TextAnimate } from "../magicui/text-animate";
import { BlurFade } from "../magicui/blur-fade";

interface OnboardingScreenProps {
  isOpen: boolean;
  onComplete: () => void;
}

// Custom DialogContent without close button
const DialogContentWithoutCloseButton = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {/* Close button removed */}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContentWithoutCloseButton.displayName = "DialogContentWithoutCloseButton";

export function OnboardingScreen({
  isOpen,
  onComplete,
}: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isClaudeInstalled, setIsClaudeInstalled] = useState(false);
  const claudeOpened = useRef(false);
  const { currentClient } = useStore(appStore, (state) => ({
    currentClient: state.currentClient,
  }));

  const steps = [
    {
      title: "Välkommen till Staten.ai",
      description: "Börja med att dra Staten.ai-appen till Claude",
    },
    {
      title: "Toppen!",
      description: isClaudeInstalled
        ? `För att gå vidare, öppna Claude Desktop och skriv "Hej Staten"`
        : "För att gå vidare, ladda ner och installera Claude Desktop",
    },
    {
      title: "Klart!",
      description: "Nu är vi klara. Dags att utforska!",
    },
  ];

  useEffect(() => {
    if (currentStep === 1) {
      invoke<boolean>("check_client_installed", { client: currentClient })
        .then((installed) => {
          setIsClaudeInstalled(installed);
          console.log("Claude installed:", installed);
        })
        .catch((error) => {
          console.error("Failed to check Claude installation:", error);
        });
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 1) return;

    const checkOnboardingStatus = async () => {
      try {
        const isCompleted = await invoke<boolean>("check_onboarding_completed");
        console.log("Onboarding check result:", isCompleted);

        if (isCompleted) {
          setCurrentStep(2);
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
      }
    };

    // Set up polling to check status every 2 seconds
    const intervalId = setInterval(checkOnboardingStatus, 2000);

    // Set up window focus handler
    const handleWindowFocus = () => {
      // When window regains focus, check Claude installation status again
      invoke<boolean>("check_client_installed", { client: currentClient })
        .then((installed) => {
          setIsClaudeInstalled(installed);
          console.log("Claude installed (focus check):", installed);
        })
        .catch((error) => {
          console.error("Failed to check Claude installation:", error);
        });

      checkOnboardingStatus();
    };

    window.addEventListener("focus", handleWindowFocus);

    checkOnboardingStatus();

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      clearInterval(intervalId);
    };
  }, [currentStep]);

  const onDropSuccess = () => {
    setCurrentStep(currentStep + 1);

    invoke("install_staten_mcp", { client: currentClient })
      .then(() => {
        console.log("Successfully installed staten-mcp");
      })
      .catch((error) => {
        console.error("Failed to install staten-mcp:", error);
      });
  };

  const handleOpenClaude = () => {
    claudeOpened.current = true; // Set flag indicating Claude was opened

    invoke("restart_client_app", { client: currentClient })
      .then(() => {
        console.log("Successfully opened Claude");
      })
      .catch((error) => {
        console.error("Failed to open Claude:", error);
        claudeOpened.current = false; // Reset flag if there was an error
      });
  };

  const handleDownloadClaude = () => {
    invoke("open_system_url", {
      url: "https://claude.ai/download",
    })
      .then(() => {
        console.log("Opened Claude download page");
      })
      .catch((error) => {
        console.error("Failed to open download page:", error);
      });
  };

  const handleAddMoreApps = () => {
    onComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onComplete()}>
      <DialogContentWithoutCloseButton className="w-screen bg-sand-100 max-w-screen h-screen dark:bg-sand-200">
        <div className="flex flex-col justify-between h-full w-full py-8 ">
          <DragRegion className="absolute z-overlay top-0 left-0 right-0" />
          <div>
            <div className="relative top-[80px] mx-auto flex w-full items-center justify-center">
              <div>
                <BlurFade direction="down" delay={0.5}>
                  <img
                    className="relative"
                    src="/icons/dammsugare.png"
                    alt="Staten.ai"
                    width={80}
                    height={80}
                  />
                </BlurFade>
              </div>
            </div>
            <div className="mt-20">
              <p className="text-[44px] text-center font-serif -tracking-[1px] leading-none dark:text-sand-900">
                <TextAnimate
                  delay={currentStep === 0 ? 2 : 0}
                  animation="blurInUp"
                  by="character"
                >
                  {steps[currentStep].title}
                </TextAnimate>
              </p>
              <p className="text-sm font-serif text-center text-black mt-2 dark:text-sand-800">
                <TextAnimate
                  delay={currentStep === 0 ? 2.5 : 0.5}
                  animation="blurInUp"
                  by="character"
                >
                  {steps[currentStep].description}
                </TextAnimate>
              </p>
            </div>
            <div className="mt-10 items-center justify-center flex">
              {currentStep === 0 && (
                <InstallMcpUI onDragSuccess={onDropSuccess} />
              )}
              {currentStep === 1 && (
                <BlurFade delay={1.5}>
                  <div className="flex justify-center">
                    <Button
                      onClick={
                        isClaudeInstalled
                          ? handleOpenClaude
                          : handleDownloadClaude
                      }
                      variant="secondary"
                      className="w-full bg-sand-200 dark:bg-sand-800 border border-sand-200 dark:border-sand-800 hover:bg-sand-100 dark:hover:bg-sand-800 text-sand-800 dark:text-sand-100"
                    >
                      {isClaudeInstalled ? "Öppna Claude" : "Hämta Claude"}
                    </Button>
                  </div>
                </BlurFade>
              )}
              {currentStep === 2 && (
                <BlurFade delay={1.5}>
                  <div className="flex justify-center">
                    <Button
                      onClick={handleAddMoreApps}
                      variant="secondary"
                      className="w-full bg-sand-200 dark:bg-sand-800 border border-sand-200 hover:bg-sand-100 text-sand-800 dark:border-sand-800 dark:text-sand-100 dark:hover:bg-sand-800 "
                    >
                      Lägg till fler appar
                    </Button>
                  </div>
                </BlurFade>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex w-full justify-center relative top-[120px]">
              <BlurFade delay={4}>
                <div className="flex justify-center gap-2 mb-4 mt-5">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        currentStep === index
                          ? "bg-sand-700 w-5"
                          : "bg-sand-200"
                      )}
                    />
                  ))}
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </DialogContentWithoutCloseButton>
    </Dialog>
  );
}
