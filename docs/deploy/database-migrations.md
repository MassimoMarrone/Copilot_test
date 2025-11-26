# Database Migrations - Guida al Deploy

## 📋 Overview

Questo documento spiega come gestire le migrazioni del database Prisma in sviluppo e produzione.

## 🛠️ Comandi Disponibili

### Sviluppo (Development)

```bash
# Crea una nuova migrazione
npx prisma migrate dev --name nome_migrazione

# Applica le migrazioni e genera il client
npx prisma migrate dev

# Sincronizza lo schema senza creare migrazione (rapido, per prototipazione)
npx prisma db push

# Reset completo del database (CANCELLA TUTTI I DATI!)
npx prisma migrate reset
```

### Produzione (Production)

```bash
# Applica le migrazioni pendenti (SICURO per produzione)
npm run db:deploy
# oppure
npx prisma migrate deploy

# Marca una migrazione come già applicata (se fatta manualmente)
npm run db:resolve
# oppure
npx prisma migrate resolve --applied NOME_MIGRAZIONE
```

## 🚀 Deploy su Render

### Configurazione Automatica

Nel file `render.yaml` o nelle impostazioni del servizio Render, configura:

**Build Command:**

```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

**Start Command:**

```bash
npm start
```

### Variabili d'Ambiente su Render

Assicurati di avere configurato:

- `DATABASE_URL` - Connection string del database PostgreSQL
- `DIRECT_URL` - URL diretto per le migrazioni (se usi Neon/Supabase con pooling)

## 🔄 Flusso di Lavoro Consigliato

### 1. Sviluppo Locale

```bash
# Modifica prisma/schema.prisma
# Poi crea la migrazione
npx prisma migrate dev --name descrizione_cambio
```

### 2. Test su Database di Test

```bash
# Imposta DATABASE_URL al DB di test
npx prisma migrate deploy
```

### 3. Deploy in Produzione

```bash
# Su Render/Vercel/Railway, il comando viene eseguito automaticamente
# Oppure manualmente:
DATABASE_URL="postgresql://user:pass@host/db" npx prisma migrate deploy
```

## ⚠️ Risoluzione Problemi

### Errore: "Migration already applied"

Se una migrazione è già stata applicata manualmente:

```bash
npx prisma migrate resolve --applied "20251124230526_init_postgres"
```

### Errore: "Advisory lock timeout" (P1002)

Il database è bloccato. Soluzioni:

1. Aspetta qualche minuto e riprova
2. Usa `npx prisma db push` come alternativa temporanea
3. Verifica che non ci siano altre connessioni attive

### Errore: "Column already exists"

Lo schema è già aggiornato ma la migrazione non è registrata:

```bash
# Marca tutte le migrazioni come applicate
npx prisma migrate resolve --applied "20251124230526_init_postgres"
npx prisma migrate resolve --applied "20251125211327_add_soft_delete_fields"
npx prisma migrate resolve --applied "20251125213421_add_original_email_field"
npx prisma migrate resolve --applied "20251125230440_add_smart_booking_fields"
npx prisma migrate resolve --applied "20251126014820_add_username_field"
```

### Database Nuovo/Vuoto

```bash
# Applica tutte le migrazioni dall'inizio
npx prisma migrate deploy
```

## 📁 Struttura Migrazioni

```
prisma/
├── schema.prisma          # Schema del database
└── migrations/
    ├── migration_lock.toml
    ├── 20251124230526_init_postgres/
    │   └── migration.sql
    ├── 20251125211327_add_soft_delete_fields/
    │   └── migration.sql
    ├── 20251125213421_add_original_email_field/
    │   └── migration.sql
    ├── 20251125230440_add_smart_booking_fields/
    │   └── migration.sql
    └── 20251126014820_add_username_field/
        └── migration.sql
```

## 🔐 Best Practices

1. **Mai modificare migrazioni già applicate** - Crea sempre nuove migrazioni
2. **Backup prima del deploy** - Specialmente per migrazioni distruttive
3. **Testa le migrazioni** - Prima su un DB di test, poi in produzione
4. **Usa transazioni** - Prisma le usa automaticamente
5. **Documenta i cambiamenti** - Nomi descrittivi per le migrazioni

## 📊 Verificare lo Stato

```bash
# Vedi lo stato delle migrazioni
npx prisma migrate status

# Output esempio:
# 5 migrations found in prisma/migrations
# ✔ 20251124230526_init_postgres (applied)
# ✔ 20251125211327_add_soft_delete_fields (applied)
# ✔ 20251125213421_add_original_email_field (applied)
# ✔ 20251125230440_add_smart_booking_fields (applied)
# ✔ 20251126014820_add_username_field (applied)
```
