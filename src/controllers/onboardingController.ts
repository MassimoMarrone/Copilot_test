import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import logger from "../utils/logger";

// POST /api/onboarding/upload-document - Upload ID document
export const uploadOnboardingDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Non autenticato" });
      return;
    }

    const file = req.file as Express.Multer.File & { path?: string };
    if (!file) {
      res.status(400).json({ error: "Nessun file caricato" });
      return;
    }

    const { documentSide } = req.body; // "front" or "back"
    if (!documentSide || !["front", "back"].includes(documentSide)) {
      res
        .status(400)
        .json({ error: "Specificare documentSide: 'front' o 'back'" });
      return;
    }

    const documentUrl = file.path; // Cloudinary URL

    const updateData =
      documentSide === "front"
        ? { idDocumentFrontUrl: documentUrl }
        : { idDocumentBackUrl: documentUrl };

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info(`Document ${documentSide} uploaded for user ${userId}`);

    res.json({
      message: `Documento ${
        documentSide === "front" ? "fronte" : "retro"
      } caricato con successo`,
      url: documentUrl,
      side: documentSide,
    });
  } catch (error: any) {
    logger.error("Error uploading onboarding document:", error);
    logger.error("Error details:", error.message, error.http_code);
    res
      .status(500)
      .json({ 
        error: "Errore durante il caricamento del documento",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
};

// POST /api/onboarding - Submit provider onboarding data
export const providerOnboarding = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Non autenticato" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "Utente non trovato" });
      return;
    }

    // Verifica che sia un provider o che voglia diventarlo
    if (user.userType !== "provider" && !user.isProvider) {
      res
        .status(403)
        .json({ error: "Solo i provider possono completare l'onboarding" });
      return;
    }

    // Se già approvato, non permettere di rifare l'onboarding
    if (user.onboardingStatus === "approved") {
      res.status(400).json({ error: "Onboarding già completato e approvato" });
      return;
    }

    const {
      step,
      // Step 1 - Personal Data
      firstName,
      lastName,
      dateOfBirth,
      fiscalCode,
      vatNumber,
      phone,
      address,
      city,
      postalCode,
      // Step 2 - Documents (URLs from Cloudinary)
      idDocumentFrontUrl,
      idDocumentBackUrl,
      idDocumentType,
      idDocumentNumber,
      idDocumentExpiry,
      // Step 3 - Payment Info
      iban,
      bankAccountHolder,
      // Step 4 - Work Info
      workingZones,
      yearsOfExperience,
      hasOwnEquipment,
      insuranceNumber,
      insuranceExpiry,
    } = req.body;

    // Build update object based on step
    const updateData: Record<string, unknown> = {};

    if (step === 1 || step === undefined) {
      // Step 1: Personal Data
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
      if (fiscalCode) updateData.fiscalCode = fiscalCode.toUpperCase();
      if (vatNumber !== undefined) updateData.vatNumber = vatNumber || null;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (postalCode) updateData.postalCode = postalCode;

      updateData.onboardingStep = Math.max(user.onboardingStep || 0, 1);
      updateData.onboardingStatus = "pending";
    }

    if (step === 2 || step === undefined) {
      // Step 2: Documents
      if (idDocumentFrontUrl)
        updateData.idDocumentFrontUrl = idDocumentFrontUrl;
      if (idDocumentBackUrl) updateData.idDocumentBackUrl = idDocumentBackUrl;
      if (idDocumentType) updateData.idDocumentType = idDocumentType;
      if (idDocumentNumber) updateData.idDocumentNumber = idDocumentNumber;
      if (idDocumentExpiry)
        updateData.idDocumentExpiry = new Date(idDocumentExpiry);

      if (idDocumentFrontUrl && idDocumentBackUrl) {
        updateData.onboardingStep = Math.max(user.onboardingStep || 0, 2);
        updateData.onboardingStatus = "documents_uploaded";
      }
    }

    if (step === 3 || step === undefined) {
      // Step 3: Payment Info
      if (iban) updateData.iban = iban.replace(/\s/g, "").toUpperCase();
      if (bankAccountHolder) updateData.bankAccountHolder = bankAccountHolder;

      if (iban && bankAccountHolder) {
        updateData.onboardingStep = Math.max(user.onboardingStep || 0, 3);
      }
    }

    if (step === 4 || step === undefined) {
      // Step 4: Work Info
      if (workingZones) {
        updateData.workingZones =
          typeof workingZones === "string"
            ? workingZones
            : JSON.stringify(workingZones);
      }
      if (yearsOfExperience !== undefined)
        updateData.yearsOfExperience = parseInt(yearsOfExperience);
      if (hasOwnEquipment !== undefined)
        updateData.hasOwnEquipment = Boolean(hasOwnEquipment);
      if (insuranceNumber !== undefined)
        updateData.insuranceNumber = insuranceNumber || null;
      if (insuranceExpiry)
        updateData.insuranceExpiry = new Date(insuranceExpiry);

      // If all required fields are filled, set status to under_review
      const isComplete = checkOnboardingComplete(user, updateData);
      if (isComplete) {
        updateData.onboardingStep = 4;
        updateData.onboardingStatus = "under_review";
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
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

    logger.info(
      `Provider onboarding updated for user ${userId}, step: ${
        step || "all"
      }, status: ${updatedUser.onboardingStatus}`
    );

    res.json({
      message: "Dati onboarding salvati con successo",
      user: updatedUser,
    });
  } catch (error) {
    logger.error("Error in provider onboarding:", error);
    res.status(500).json({ error: "Errore durante il salvataggio dei dati" });
  }
};

// GET /api/onboarding/status - Get current onboarding status
export const getProviderOnboardingStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Non autenticato" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        userType: true,
        isProvider: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
        onboardingRejectedAt: true,
        onboardingRejectionReason: true,
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
      res.status(404).json({ error: "Utente non trovato" });
      return;
    }

    // Calcola completamento per ogni step
    const steps = {
      step1: {
        complete: Boolean(
          user.firstName &&
            user.lastName &&
            user.dateOfBirth &&
            user.fiscalCode &&
            user.phone &&
            user.address &&
            user.city &&
            user.postalCode
        ),
        fields: {
          firstName: !!user.firstName,
          lastName: !!user.lastName,
          dateOfBirth: !!user.dateOfBirth,
          fiscalCode: !!user.fiscalCode,
          vatNumber: !!user.vatNumber,
          phone: !!user.phone,
          address: !!user.address,
          city: !!user.city,
          postalCode: !!user.postalCode,
        },
      },
      step2: {
        complete: Boolean(
          user.idDocumentFrontUrl &&
            user.idDocumentBackUrl &&
            user.idDocumentType &&
            user.idDocumentNumber &&
            user.idDocumentExpiry
        ),
        fields: {
          idDocumentFrontUrl: !!user.idDocumentFrontUrl,
          idDocumentBackUrl: !!user.idDocumentBackUrl,
          idDocumentType: !!user.idDocumentType,
          idDocumentNumber: !!user.idDocumentNumber,
          idDocumentExpiry: !!user.idDocumentExpiry,
        },
      },
      step3: {
        complete: Boolean(user.iban && user.bankAccountHolder),
        fields: {
          iban: !!user.iban,
          bankAccountHolder: !!user.bankAccountHolder,
        },
      },
      step4: {
        complete: Boolean(user.workingZones && user.yearsOfExperience !== null),
        fields: {
          workingZones: !!user.workingZones,
          yearsOfExperience: user.yearsOfExperience !== null,
          hasOwnEquipment: user.hasOwnEquipment,
          insuranceNumber: !!user.insuranceNumber,
          insuranceExpiry: !!user.insuranceExpiry,
        },
      },
    };

    const overallProgress = [
      steps.step1.complete,
      steps.step2.complete,
      steps.step3.complete,
      steps.step4.complete,
    ].filter(Boolean).length;

    res.json({
      user,
      steps,
      overallProgress: `${overallProgress}/4`,
      isComplete: overallProgress === 4,
      canSubmitForReview:
        overallProgress === 4 &&
        user.onboardingStatus !== "under_review" &&
        user.onboardingStatus !== "approved",
    });
  } catch (error) {
    logger.error("Error getting onboarding status:", error);
    res.status(500).json({ error: "Errore durante il recupero dello stato" });
  }
};

// Helper function to check if onboarding is complete
function checkOnboardingComplete(
  user: Record<string, unknown>,
  updateData: Record<string, unknown>
): boolean {
  const merged = { ...user, ...updateData };

  // Required fields for each step
  const step1Complete = Boolean(
    merged.firstName &&
      merged.lastName &&
      merged.dateOfBirth &&
      merged.fiscalCode &&
      merged.phone &&
      merged.address &&
      merged.city &&
      merged.postalCode
  );

  const step2Complete = Boolean(
    merged.idDocumentFrontUrl &&
      merged.idDocumentBackUrl &&
      merged.idDocumentType &&
      merged.idDocumentNumber &&
      merged.idDocumentExpiry
  );

  const step3Complete = Boolean(merged.iban && merged.bankAccountHolder);

  const step4Complete = Boolean(
    merged.workingZones &&
      merged.yearsOfExperience !== null &&
      merged.yearsOfExperience !== undefined
  );

  return step1Complete && step2Complete && step3Complete && step4Complete;
}
