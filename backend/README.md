# VITMATERNA Backend

> Node.js API server for the VITMATERNA prenatal health platform.

## Prerequisites

- **Node.js** >= 22.0.0
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start database services
docker compose up -d

# 4. Generate Prisma client
npm run prisma:generate

# 5. Run migrations
npm run prisma:migrate

# 6. Seed the database
npm run prisma:seed

# 7. Start development server
npm run dev
```

The API will be available at `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health`

## Default Admin Credentials

- **DNI:** 99999999
- **Password:** Admin@2026

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run test suite |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:seed` | Seed the database |
