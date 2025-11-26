#!/bin/bash
# Render Build Script

echo "🔧 Installing dependencies..."
npm install

echo "🔄 Resolving failed migration..."
npx prisma migrate resolve --applied 20251125230440_add_smart_booking_fields || true

echo "📦 Generating Prisma Client..."
npx prisma generate

echo "🚀 Running migrations..."
npx prisma migrate deploy

echo "🏗️ Building application..."
npm run build

echo "✅ Build complete!"
