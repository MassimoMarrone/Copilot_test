// Stripe Connect service for provider onboarding

const API_BASE = "";

interface StripeAccountStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: any;
}

interface OnboardingResponse {
  success: boolean;
  onboardingUrl: string;
  accountId: string;
}

interface DashboardLinkResponse {
  url: string;
}

export const stripeConnectService = {
  /**
   * Get the current Stripe account status for the provider
   */
  async getAccountStatus(): Promise<StripeAccountStatus> {
    const response = await fetch(`${API_BASE}/api/stripe-connect/status`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get Stripe status");
    }

    return response.json();
  },

  /**
   * Start Stripe Connect onboarding - redirects to Stripe
   */
  async startOnboarding(): Promise<OnboardingResponse> {
    const response = await fetch(`${API_BASE}/api/stripe-connect/onboard`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to start onboarding");
    }

    return response.json();
  },

  /**
   * Get link to Stripe Express dashboard
   */
  async getDashboardLink(): Promise<DashboardLinkResponse> {
    const response = await fetch(
      `${API_BASE}/api/stripe-connect/dashboard-link`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get dashboard link");
    }

    return response.json();
  },
};
