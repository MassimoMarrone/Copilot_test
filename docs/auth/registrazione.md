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
│     - Nome e Cognome                                            │
│     - Nome Utente (univoco, 3-20 caratteri alfanumerici)        │
│     - Email                                                      │
│     - Telefono (opzionale)                                      │
│     - Password (min 8 caratteri)                                │
│     - Conferma Password                                          │
│     - ✓ Accettazione Termini e Condizioni                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. VALIDAZIONE CLIENT-SIDE                                     │
│     - Nome e Cognome obbligatori                                │
│     - Username: 3-20 caratteri, solo lettere/numeri/underscore  │
│     - Email formato valido                                       │
│     - Password ≥ 8 caratteri                                    │
│     - Password e Conferma coincidono                            │
│     - Termini accettati                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. API CALL: POST /api/register                                │
│     Body: { email, username, password, firstName, lastName,     │
│             phone, acceptedTerms }                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. BACKEND: Validazione Server-side                            │
│     - express-validator verifica input                          │
│     - Controlla se email già esistente                          │
│     - Controlla se username già esistente                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        [Email/Username                  [Dati nuovi]
         esiste]                              │
              │                               │
              ▼                               ▼
┌─────────────────────┐         ┌─────────────────────────────────┐
│ Return Error 400    │         │  5. CREAZIONE UTENTE            │
│ "Email/Username     │         │     - Hash password (bcrypt)    │
│  già in uso"        │         │     - Genera verification token │
└─────────────────────┘         │     - Salva user nel DB         │
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

## Campi del Form di Registrazione

| Campo             | Tipo     | Obbligatorio | Validazione                         |
| ----------------- | -------- | ------------ | ----------------------------------- |
| Nome              | text     | ✅           | Stringa non vuota                   |
| Cognome           | text     | ✅           | Stringa non vuota                   |
| Nome Utente       | text     | ✅           | 3-20 caratteri, solo `[a-zA-Z0-9_]` |
| Email             | email    | ✅           | Formato email valido                |
| Telefono          | tel      | ❌           | Formato telefono (opzionale)        |
| Password          | password | ✅           | Minimo 8 caratteri                  |
| Conferma Password | password | ✅           | Deve corrispondere alla password    |
| Termini           | checkbox | ✅           | Deve essere accettato               |

## Login con Email o Username

Gli utenti possono accedere utilizzando:

- **Email**: mario.rossi@email.com
- **Username**: mario_rossi

Il backend cerca l'utente sia per email che per username:

```typescript
const user = await prisma.user.findFirst({
  where: {
    OR: [{ email: identifier }, { username: identifier.toLowerCase() }],
  },
});
```

## File Coinvolti

| Layer    | File                                     | Funzione              |
| -------- | ---------------------------------------- | --------------------- |
| Frontend | `src-react/components/RegisterModal.tsx` | Form di registrazione |
| Frontend | `src-react/components/LoginModal.tsx`    | Form di login         |
| Frontend | `src-react/services/authService.ts`      | API call              |
| Backend  | `src/routes/auth.ts`                     | Route `/register`     |
| Backend  | `src/controllers/authController.ts`      | Logica controller     |
| Backend  | `src/services/authService.ts`            | Business logic        |
| Backend  | `src/emailService.ts`                    | Invio email           |
| Database | `prisma/schema.prisma`                   | Model `User`          |

## Schema Database - User

```prisma
model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  username              String?   @unique
  password              String
  displayName           String?
  firstName             String?
  lastName              String?
  phone                 String?
  city                  String?
  address               String?
  postalCode            String?
  bio                   String?
  avatarUrl             String?
  userType              String    @default("client")
  isClient              Boolean   @default(true)
  isProvider            Boolean   @default(false)
  isVerified            Boolean   @default(false)
  verificationToken     String?
  verificationTokenExpires DateTime?
  acceptedTerms         Boolean   @default(false)
  createdAt             DateTime  @default(now())
}
```

## Validazioni

### Client-side (React)

```typescript
// Nome e Cognome
firstName.trim() !== "" && lastName.trim() !== "";

// Username
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
usernameRegex.test(username);

// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password
password.length >= 8;

// Conferma
password === confirmPassword;

// Termini
acceptedTerms === true;
```

### Server-side (Express Validator)

```typescript
// Username validation
if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
  throw new Error("Username must be 3-20 characters...");
}

// Check uniqueness
const existingEmail = await prisma.user.findUnique({ where: { email } });
const existingUsername = await prisma.user.findUnique({ where: { username } });
```

## Codici di Errore

| Codice | Messaggio                    | Causa               |
| ------ | ---------------------------- | ------------------- |
| 400    | "Email already registered"   | Email esistente     |
| 400    | "Username already taken"     | Username esistente  |
| 400    | "Password troppo corta"      | < 8 caratteri       |
| 400    | "Devi accettare i termini"   | Terms non accettati |
| 400    | "Nome e cognome obbligatori" | Campi vuoti         |
| 500    | "Errore server"              | Errore interno      |

## Sicurezza

- ✅ Password hashata con **bcrypt** (12 rounds)
- ✅ Token verifica generato con **crypto.randomBytes**
- ✅ Rate limiting su endpoint (max 5 richieste/minuto)
- ✅ Sanitizzazione input con express-validator
- ✅ Username salvato in lowercase per evitare duplicati
