import { prisma } from "../lib/prisma";
import { sendEmail, emailTemplates } from "../emailService";
import { sendNotification } from "../utils/notification";

export const adminService = {
  async getAllUsers() {
    const users = await prisma.user.findMany();
    const safeUsers = users.map(({ password, ...user }: any) => user);
    return safeUsers;
  },

  async blockUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.userType === "admin") {
      throw new Error("Cannot block an admin");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

    // Cancel all pending bookings for this user (as client or provider)
    await prisma.booking.updateMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
        status: "pending",
      },
      data: {
        status: "cancelled",
      },
    });

    return { success: true };
  },

  async unblockUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });
    return { success: true };
  },

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Prevent deleting the last admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        throw new Error("Cannot delete the last admin");
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    // Also clean up related data
    await prisma.service.deleteMany({ where: { providerId: userId } });

    return { success: true };
  },

  async getAllServices() {
    const services = await prisma.service.findMany();
    return services;
  },

  async deleteService(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    await prisma.service.delete({ where: { id: serviceId } });
    return { success: true };
  },

  async getAllBookings() {
    const bookings = await prisma.booking.findMany({
      orderBy: { date: "desc" },
    });
    return bookings;
  },

  async cancelBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });
    return { success: true };
  },

  async deleteBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    await prisma.booking.delete({ where: { id: bookingId } });
    return { success: true };
  },

  async getStats() {
    const totalUsers = await prisma.user.count();
    const totalServices = await prisma.service.count();
    const totalBookings = await prisma.booking.count();

    // Calculate total revenue (sum of amounts of completed bookings)
    const completedBookings = await prisma.booking.findMany({
      where: { status: "completed" },
      select: { amount: true },
    });

    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + booking.amount,
      0
    );

    // Additional stats for dashboard
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    const pendingBookings = await prisma.booking.count({
      where: { status: "pending" },
    });

    const activeProviders = await prisma.user.count({
      where: { isProvider: true, isBlocked: false },
    });

    const completedBookingsCount = await prisma.booking.count({
      where: { status: "completed" },
    });

    return {
      totalUsers,
      totalServices,
      totalBookings,
      totalRevenue,
      newUsersToday,
      pendingBookings,
      activeProviders,
      completedBookings: completedBookingsCount,
    };
  },

  // ============ SUPER ADMIN ONLY ============

  async getAllAdmins() {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        adminLevel: true,
        createdAt: true,
      },
    });
    return admins;
  },

  async promoteToAdmin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isAdmin) {
      throw new Error("User is already an admin");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin: true,
        adminLevel: "standard",
        userType: "admin",
      },
    });

    return { success: true, message: "User promoted to admin" };
  },

  async demoteAdmin(userId: string, currentAdminId: string) {
    if (userId === currentAdminId) {
      throw new Error("Cannot demote yourself");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isAdmin) {
      throw new Error("User is not an admin");
    }

    if (user.adminLevel === "super") {
      throw new Error("Cannot demote a super admin");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin: false,
        adminLevel: null,
        userType: user.isProvider ? "provider" : "client",
      },
    });

    return { success: true, message: "Admin demoted to user" };
  },

  // ============ PROVIDER ONBOARDING ============

  async getPendingOnboardings() {
    const pending = await prisma.user.findMany({
      where: {
        isProvider: true,
        onboardingStatus: {
          in: ["under_review", "documents_uploaded", "pending"],
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
        createdAt: true,
        phone: true,
        city: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return pending;
  },

  async getOnboardingDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
        onboardingRejectedAt: true,
        onboardingRejectionReason: true,
        createdAt: true,
        // Step 1
        dateOfBirth: true,
        fiscalCode: true,
        vatNumber: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        // Step 2
        idDocumentType: true,
        idDocumentNumber: true,
        idDocumentExpiry: true,
        idDocumentFrontUrl: true,
        idDocumentBackUrl: true,
        // Step 3
        iban: true,
        bankAccountHolder: true,
        // Step 4
        workingZones: true,
        yearsOfExperience: true,
        hasOwnEquipment: true,
        insuranceNumber: true,
        insuranceExpiry: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  async approveOnboarding(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Allow approval for pending, documents_uploaded, or under_review status
    const validStatuses = ["pending", "documents_uploaded", "under_review"];
    if (
      !user.onboardingStatus ||
      !validStatuses.includes(user.onboardingStatus)
    ) {
      throw new Error(
        `Cannot approve onboarding with status: ${user.onboardingStatus}`
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "approved",
        onboardingCompletedAt: new Date(),
        onboardingRejectedAt: null,
        onboardingRejectionReason: null,
      },
    });

    // Send approval email
    const userName = user.firstName || user.email.split("@")[0];
    try {
      await sendEmail(
        user.email,
        "🎉 Sei stato approvato come Fornitore Domy!",
        emailTemplates.onboardingApproved(userName)
      );
      console.log(
        `[AdminService] Email di approvazione inviata a ${user.email}`
      );
    } catch (emailError) {
      console.error(
        `[AdminService] Errore invio email approvazione:`,
        emailError
      );
      // Non blocchiamo l'operazione se l'email fallisce
    }

    // Send in-app notification
    try {
      await sendNotification(
        userId,
        "🎉 Richiesta Approvata!",
        "Congratulazioni! Sei stato approvato come fornitore. Ora puoi creare i tuoi servizi.",
        "success",
        "/provider-dashboard"
      );
      console.log(
        `[AdminService] Notifica in-app approvazione inviata a ${userId}`
      );
    } catch (notifError) {
      console.error(`[AdminService] Errore invio notifica in-app:`, notifError);
    }

    return { success: true, message: "Onboarding approved" };
  },

  async rejectOnboarding(userId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Allow rejection for pending, documents_uploaded, or under_review status
    const validStatuses = ["pending", "documents_uploaded", "under_review"];
    if (
      !user.onboardingStatus ||
      !validStatuses.includes(user.onboardingStatus)
    ) {
      throw new Error(
        `Cannot reject onboarding with status: ${user.onboardingStatus}`
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "rejected",
        onboardingRejectedAt: new Date(),
        onboardingRejectionReason: reason,
      },
    });

    // Send rejection email with the reason
    const userName = user.firstName || user.email.split("@")[0];
    try {
      await sendEmail(
        user.email,
        "Aggiornamento sulla tua richiesta Fornitore Domy",
        emailTemplates.onboardingRejected(userName, reason)
      );
      console.log(
        `[AdminService] Email di rifiuto inviata a ${user.email} con motivo: ${reason}`
      );
    } catch (emailError) {
      console.error(`[AdminService] Errore invio email rifiuto:`, emailError);
      // Non blocchiamo l'operazione se l'email fallisce
    }

    // Send in-app notification with rejection reason
    try {
      await sendNotification(
        userId,
        "❌ Richiesta Non Approvata",
        `La tua richiesta fornitore non è stata approvata. Motivo: ${reason}`,
        "error",
        "/provider-onboarding"
      );
      console.log(`[AdminService] Notifica in-app rifiuto inviata a ${userId}`);
    } catch (notifError) {
      console.error(`[AdminService] Errore invio notifica in-app:`, notifError);
    }

    return { success: true, message: "Onboarding rejected" };
  },

  // ============ DISPUTE MANAGEMENT ============

  async getDisputes(status?: string) {
    const where =
      status && status !== "all"
        ? { disputeStatus: status }
        : { disputeStatus: { not: null } };

    const disputes = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
        provider: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: { disputeOpenedAt: "desc" },
    });

    return disputes.map((booking) => ({
      id: booking.id,
      serviceId: booking.serviceId,
      serviceTitle: booking.serviceTitle,
      serviceCategory: booking.service?.category,
      clientId: booking.clientId,
      clientEmail: booking.clientEmail,
      clientName:
        booking.client?.displayName ||
        `${booking.client?.firstName || ""} ${
          booking.client?.lastName || ""
        }`.trim() ||
        booking.clientEmail.split("@")[0],
      providerId: booking.providerId,
      providerEmail: booking.providerEmail,
      providerName:
        booking.provider?.displayName ||
        `${booking.provider?.firstName || ""} ${
          booking.provider?.lastName || ""
        }`.trim() ||
        booking.providerEmail.split("@")[0],
      date: booking.date,
      amount: booking.amount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      photoProof: booking.photoProof,
      photoProofs: booking.photoProofs ? JSON.parse(booking.photoProofs) : [],
      disputeStatus: booking.disputeStatus,
      disputeReason: booking.disputeReason,
      disputeOpenedAt: booking.disputeOpenedAt,
      disputeResolvedAt: booking.disputeResolvedAt,
      disputeResolvedBy: booking.disputeResolvedBy,
      disputeNotes: booking.disputeNotes,
      createdAt: booking.createdAt,
    }));
  },

  async getDisputeDetails(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        provider: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        service: true,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!booking.disputeStatus) {
      throw new Error("This booking has no dispute");
    }

    return {
      ...booking,
      photoProofs: booking.photoProofs ? JSON.parse(booking.photoProofs) : [],
    };
  },

  async resolveDispute(
    bookingId: string,
    adminId: string,
    resolution: "refund" | "release",
    notes: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        provider: true,
        service: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.disputeStatus !== "pending") {
      throw new Error("This dispute is not pending");
    }

    // Import escrowService dynamically to avoid circular dependency
    const { escrowService } = await import("./escrowService");

    if (resolution === "refund") {
      // Refund to client
      await escrowService.refundPaymentToClient(
        bookingId,
        `Dispute resolved in client's favor: ${notes}`
      );

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          disputeStatus: "resolved_refund",
          disputeResolvedAt: new Date(),
          disputeResolvedBy: adminId,
          disputeNotes: notes,
        },
      });

      // Notify both parties
      await sendNotification(
        booking.clientId,
        "Controversia Risolta ✅",
        `La controversia per "${booking.serviceTitle}" è stata risolta a tuo favore. Riceverai un rimborso.`,
        "success"
      );

      await sendNotification(
        booking.providerId,
        "Controversia Risolta",
        `La controversia per "${booking.serviceTitle}" è stata risolta. Il pagamento è stato rimborsato al cliente.`,
        "info"
      );

      // Send emails
      await sendEmail(
        booking.clientEmail,
        "Controversia Risolta - Rimborso Approvato",
        emailTemplates.disputeResolved(
          booking.client?.displayName || booking.clientEmail.split("@")[0],
          booking.serviceTitle,
          `Il rimborso è stato approvato. ${notes}`,
          false
        )
      );

      await sendEmail(
        booking.providerEmail,
        "Controversia Risolta",
        emailTemplates.disputeResolved(
          booking.provider?.displayName || booking.providerEmail.split("@")[0],
          booking.serviceTitle,
          `La controversia è stata risolta a favore del cliente. ${notes}`,
          true
        )
      );
    } else {
      // Release to provider
      await escrowService.releasePaymentToProvider(
        bookingId,
        "client_confirmed"
      );

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          disputeStatus: "resolved_payment",
          disputeResolvedAt: new Date(),
          disputeResolvedBy: adminId,
          disputeNotes: notes,
        },
      });

      // Notify both parties
      await sendNotification(
        booking.providerId,
        "Controversia Risolta ✅",
        `La controversia per "${booking.serviceTitle}" è stata risolta a tuo favore. Il pagamento è stato rilasciato.`,
        "success"
      );

      await sendNotification(
        booking.clientId,
        "Controversia Risolta",
        `La controversia per "${booking.serviceTitle}" è stata risolta. Il pagamento è stato rilasciato al fornitore.`,
        "info"
      );

      // Send emails
      await sendEmail(
        booking.providerEmail,
        "Controversia Risolta - Pagamento Rilasciato",
        emailTemplates.disputeResolved(
          booking.provider?.displayName || booking.providerEmail.split("@")[0],
          booking.serviceTitle,
          `Il pagamento è stato rilasciato. ${notes}`,
          true
        )
      );

      await sendEmail(
        booking.clientEmail,
        "Controversia Risolta",
        emailTemplates.disputeResolved(
          booking.client?.displayName || booking.clientEmail.split("@")[0],
          booking.serviceTitle,
          `La controversia è stata risolta a favore del fornitore. ${notes}`,
          false
        )
      );
    }

    return { success: true, resolution };
  },
};
