import { stripe } from "../config/stripe";
import { prisma } from "../lib/prisma";

// Platform fee percentage (e.g., 15 = 15%)
const PLATFORM_FEE_PERCENT = parseInt(
  process.env.PLATFORM_FEE_PERCENT || "15",
  10
);

export const stripeConnectService = {
  /**
   * Create a Stripe Connect Express account for a provider
   */
  async createConnectAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isProvider) {
      throw new Error("User is not a provider");
    }

    // Check if already has a Stripe account
    if (user.stripeAccountId) {
      return { accountId: user.stripeAccountId, alreadyExists: true };
    }

    // Create Express account (Stripe handles onboarding UI)
    const account = await stripe.accounts.create({
      type: "express",
      country: "IT",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        userId: user.id,
      },
    });

    // Save Stripe account ID to user
    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: account.id },
    });

    return { accountId: account.id, alreadyExists: false };
  },

  /**
   * Generate onboarding link for provider to complete Stripe setup
   */
  async createOnboardingLink(
    userId: string,
    returnUrl: string,
    refreshUrl: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let accountId = user.stripeAccountId;

    // Create account if doesn't exist
    if (!accountId) {
      const result = await this.createConnectAccount(userId);
      accountId = result.accountId;
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return { url: accountLink.url, accountId };
  },

  /**
   * Create login link for provider to access Stripe dashboard
   */
  async createDashboardLink(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.stripeAccountId) {
      throw new Error("Provider has no Stripe account");
    }

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripeAccountId
    );
    return { url: loginLink.url };
  },

  /**
   * Check if provider's Stripe account is fully onboarded
   */
  async getAccountStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.stripeAccountId) {
      return {
        hasAccount: false,
        isOnboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirements: null,
      };
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    return {
      hasAccount: true,
      isOnboarded: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
    };
  },

  /**
   * Check if a provider can receive payments
   */
  async canReceivePayments(providerId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: providerId },
    });

    if (!user?.stripeAccountId) {
      return false;
    }

    // In test mode, skip Stripe API call if using dummy key
    if (
      process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
      !process.env.STRIPE_SECRET_KEY
    ) {
      return true; // Allow in test mode
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    return account.charges_enabled === true;
  },

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount: number): number {
    return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
  },

  /**
   * Get platform fee percentage
   */
  getPlatformFeePercent(): number {
    return PLATFORM_FEE_PERCENT;
  },

  /**
   * Handle webhook for account updates
   */
  async handleAccountUpdated(account: any) {
    const userId = account.metadata?.userId;

    if (!userId) {
      console.log("Account updated webhook: no userId in metadata");
      return;
    }

    // You could send notification to provider when onboarding is complete
    if (account.charges_enabled && account.payouts_enabled) {
      console.log(`Provider ${userId} Stripe onboarding completed`);
      // TODO: Send notification to provider
    }
  },
};
