import { prisma } from "../lib/prisma";
import crypto from "crypto";

export type ConsentType =
  | "terms_of_service"
  | "privacy_policy"
  | "provider_contract"
  | "cookie_policy";

// Versioni attuali dei documenti legali
export const DOCUMENT_VERSIONS = {
  terms_of_service: "2025-12-18",
  privacy_policy: "2025-12-18",
  provider_contract: "2025-12-18",
  cookie_policy: "2025-12-18",
};

/**
 * Genera hash SHA256 del contenuto del documento
 * Questo serve per provare che il documento non è stato modificato dopo l'accettazione
 */
function generateDocumentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export const consentService = {
  /**
   * Registra un nuovo consenso
   */
  async recordConsent(params: {
    userId: string;
    consentType: ConsentType;
    ipAddress?: string;
    userAgent?: string;
    acceptanceMethod?: string;
    documentContent?: string; // Opzionale: contenuto del documento per generare hash
  }) {
    const {
      userId,
      consentType,
      ipAddress,
      userAgent,
      acceptanceMethod = "checkbox",
      documentContent,
    } = params;

    const documentVersion = DOCUMENT_VERSIONS[consentType];
    const documentHash = documentContent
      ? generateDocumentHash(documentContent)
      : undefined;

    // Disattiva eventuali consensi precedenti dello stesso tipo
    await prisma.consentRecord.updateMany({
      where: {
        userId,
        consentType,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: "superseded_by_new_version",
      },
    });

    // Crea nuovo record di consenso
    const consent = await prisma.consentRecord.create({
      data: {
        userId,
        consentType,
        documentVersion,
        documentHash,
        ipAddress,
        userAgent,
        acceptanceMethod,
        isActive: true,
      },
    });

    console.log(
      `[ConsentService] Recorded ${consentType} consent for user ${userId}, version ${documentVersion}`
    );

    return consent;
  },

  /**
   * Verifica se l'utente ha accettato un determinato tipo di consenso
   */
  async hasActiveConsent(
    userId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    const consent = await prisma.consentRecord.findFirst({
      where: {
        userId,
        consentType,
        isActive: true,
      },
    });
    return !!consent;
  },

  /**
   * Ottieni tutti i consensi attivi di un utente
   */
  async getUserConsents(userId: string) {
    return prisma.consentRecord.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { acceptedAt: "desc" },
    });
  },

  /**
   * Ottieni lo storico completo dei consensi di un utente (anche revocati)
   */
  async getUserConsentHistory(userId: string) {
    return prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { acceptedAt: "desc" },
    });
  },

  /**
   * Revoca un consenso (per GDPR)
   */
  async revokeConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ) {
    const result = await prisma.consentRecord.updateMany({
      where: {
        userId,
        consentType,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason || "user_requested",
      },
    });

    console.log(
      `[ConsentService] Revoked ${consentType} consent for user ${userId}`
    );

    return result;
  },

  /**
   * Verifica se l'utente deve accettare una nuova versione dei termini
   */
  async needsConsentUpdate(
    userId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    const currentVersion = DOCUMENT_VERSIONS[consentType];

    const latestConsent = await prisma.consentRecord.findFirst({
      where: {
        userId,
        consentType,
        isActive: true,
      },
      orderBy: { acceptedAt: "desc" },
    });

    if (!latestConsent) return true;

    return latestConsent.documentVersion !== currentVersion;
  },

  /**
   * Ottieni i dettagli del consenso per mostrare all'utente
   * (utile per email di notifica violazione o admin panel)
   */
  async getConsentDetails(userId: string, consentType: ConsentType) {
    const consent = await prisma.consentRecord.findFirst({
      where: {
        userId,
        consentType,
        isActive: true,
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!consent) return null;

    return {
      ...consent,
      acceptedAtFormatted: consent.acceptedAt.toLocaleString("it-IT", {
        dateStyle: "full",
        timeStyle: "medium",
      }),
    };
  },

  /**
   * Genera un report dei consensi per un utente (per richieste GDPR)
   */
  async generateConsentReport(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    const consents = await prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { acceptedAt: "desc" },
    });

    return {
      user,
      consents: consents.map((c) => ({
        type: c.consentType,
        version: c.documentVersion,
        acceptedAt: c.acceptedAt.toISOString(),
        ipAddress: c.ipAddress,
        method: c.acceptanceMethod,
        isActive: c.isActive,
        revokedAt: c.revokedAt?.toISOString(),
        revokedReason: c.revokedReason,
      })),
      generatedAt: new Date().toISOString(),
    };
  },
};
