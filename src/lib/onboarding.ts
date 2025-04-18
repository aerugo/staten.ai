// Key used for storing onboarding state in local storage
const ONBOARDING_COMPLETED_KEY = "staten-onboarding-completed";

/**
 * Check if the onboarding has been completed
 * @returns boolean indicating if onboarding has been completed
 */
export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
  } catch (error) {
    // In case of any errors (e.g., localStorage not available), default to false
    console.error("Error checking onboarding status:", error);
    return false;
  }
}

/**
 * Mark the onboarding as completed
 */
export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  } catch (error) {
    console.error("Error saving onboarding status:", error);
  }
}

/**
 * Reset the onboarding status (for testing purposes)
 */
export function resetOnboardingStatus(): void {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error("Error resetting onboarding status:", error);
  }
}
