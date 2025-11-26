# 📝 Registrazione Utente

## Panoramica
Il processo di registrazione permette a nuovi utenti di creare un account come Cliente o Fornitore.

## Flusso Logico

```
┌─────────────────────────────────────────────────────────────────┐
│                      REGISTRAZIONE UTENTE                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. FRONTEND: Utente compila il form                            │
│     - Email                                                      │
│     - Password (min 8 caratteri)                                │
│     - Conferma Password                                          │
│     - Tipo Utente (client/provider)                             │
│     - ✓ Accettazione Termini e Condizioni                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. VALIDAZIONE CLIENT-SIDE                                     │
│     - Email formato valido                                       │
│     - Password ≥ 8 caratteri                                    │
│     - Password e Conferma coincidono                            │
│     - Termini accettati                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. API CALL: POST /api/auth/register                           │
│     Body: { email, password, userType, acceptedTerms }          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. BACKEND: Validazione Server-side                            │
│     - express-validator verifica input                          │
│     - Controlla se email già esistente                          │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        [Email esiste]                  [Email nuova]
              │                               │
              ▼                               ▼
┌─────────────────────┐         ┌─────────────────────────────────┐
│ Return Error 400    │         │  5. CREAZIONE UTENTE            │
│ "Email già in uso"  │         │     - Hash password (bcrypt)    │
└─────────────────────┘         │     - Genera verification token │
                                │     - Salva user nel DB         │
                                └─────────────────────────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────────┐
                                │  6. INVIO EMAIL VERIFICA        │
                                │     - Resend API                │
                                │     - Link con token            │
                                │     - Scadenza: 24 ore          │
                                └─────────────────────────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────────┐
                                │  7. RESPONSE AL CLIENT          │
                                │     - Status 201 Created        │
                                │     - Message: "Controlla email"│
                                └─────────────────────────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────────┐
                                │  8. FRONTEND: Redirect          │
                                │     - Mostra messaggio successo │
                                │     - Invita a verificare email │
                                └─────────────────────────────────┘
```

## File Coinvolti

| Layer | File | Funzione |
|-------|------|----------|
| Frontend | `src-react/components/RegisterModal.tsx` | Form di registrazione |
| Frontend | `src-react/services/authService.ts` | API call |
| Backend | `src/routes/auth.ts` | Route `/register` |
| Backend | `src/controllers/authController.ts` | Logica controller |
| Backend | `src/services/authService.ts` | Business logic |
| Backend | `src/emailService.ts` | Invio email |
| Database | `prisma/schema.prisma` | Model `User` |

## Schema Database - User

```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  password              String
  userType              String    @default("client")
  isProvider            Boolean   @default(false)
  emailVerified         Boolean   @default(false)
  verificationToken     String?
  verificationExpires   DateTime?
  acceptedTerms         Boolean   @default(false)
  acceptedTermsAt       DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

## Validazioni

### Client-side (React)
```typescript
// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password
password.length >= 8

// Conferma
password === confirmPassword

// Termini
acceptedTerms === true
```

### Server-side (Express Validator)
```typescript
body("email").isEmail().normalizeEmail()
body("password").isLength({ min: 8 })
body("userType").isIn(["client", "provider"])
body("acceptedTerms").equals("true")
```

## Codici di Errore

| Codice | Messaggio | Causa |
|--------|-----------|-------|
| 400 | "Email già registrata" | Email esistente |
| 400 | "Password troppo corta" | < 8 caratteri |
| 400 | "Devi accettare i termini" | Terms non accettati |
| 500 | "Errore server" | Errore interno |

## Sicurezza

- ✅ Password hashata con **bcrypt** (10 rounds)
- ✅ Token verifica generato con **crypto.randomBytes**
- ✅ Rate limiting su endpoint (max 5 richieste/minuto)
- ✅ Sanitizzazione input con express-validator
