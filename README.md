
# Pet Mor Chor 🐾

Pet Mor Chor is a pet-related web application built with Next.js.

The platform provides features for pet adoption and sale, pet communities, direct messaging, pet care information, and pet-friendly places.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- TanStack React Query
- Axios
- Zod

## Getting Started

### Prerequisites

- Node.js
- npm
- PostgreSQL

### Installation

Clone the repository:

```bash
git clone <repository-url>
cd pet-morchor
```

Install dependencies:

```bash
npm install
```

### Environment Setup

Create a `.env` file in the project root and configure the required environment variables.

```env
APP_PORT=
POSTGRES_PORT=

POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

POSTGRES_APP_USER=
POSTGRES_APP_PASSWORD=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Replace the empty values with your local configuration.
```
Configure additional environment variables required by the application.

### Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000] in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
