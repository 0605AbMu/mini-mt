# Mini-MT: Multi-Tenant Express + TypeScript Server

A robust, production-ready Express.js server boilerplate designed for multi-tenant applications. Built with TypeScript and Prisma ORM, it features a shared database architecture with data isolation, comprehensive authentication, and session management.

## 🚀 Features

- **Multi-Tenancy**: Shared database approach with tenant isolation via middleware.
- **Express.js (v5)**: Modern web framework for Node.js.
- **TypeScript**: Type-safe development with modern features.
- **Prisma ORM**: Next-generation database toolkit for PostgreSQL.
- **Authentication & Security**:
  - JWT-based authentication (Access & Refresh tokens).
  - Session management with multi-device logout.
  - Role-based access control (Admin/User).
  - Rate limiting (Express Rate Limit & Slow Down).
  - Security headers with Helmet.
  - CORS configuration.
- **Logging**: High-performance logging with Pino and Pino-HTTP.
- **Validation**: Schema validation using Zod.
- **Database**: PostgreSQL with Prisma migrations.

## 📂 Project Structure

```text
mini-mt/
├── prisma/               # Database schema and migrations
│   ├── migrations/       # SQL migration files
│   └── schema.prisma     # Prisma data model
├── src/                  # Source code
│   ├── config/           # App configuration and env validation
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth, tenant, validation, and rate limiters
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic and external integrations
│   ├── types/            # TypeScript interfaces and types
│   ├── utils/            # Shared utilities (error handling, logger)
│   └── index.ts          # Server entry point
├── tests/                # API and integration tests
├── dist/                 # Compiled JavaScript (after build)
├── .env                  # Environment variables (required)
├── .env.local            # Local environment overrides (optional)
├── jest.config.js        # Test runner configuration
├── nodemon.json          # Development auto-reload config
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript compiler configuration
└── prisma.config.ts      # Prisma runtime configuration
```

## 🛠️ Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: v10.0.0 or higher (recommended)
- **PostgreSQL**: A running instance (local or remote)

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mini-mt
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory (see [Environment Variables](#-environment-variables)).

4. **Initialize the database**:
   Generate Prisma client and push the schema to your database:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```
   *Note: For production, use `pnpm db:migrate` instead of `db:push`.*

## 🚀 Running the App

### Development
Start the server with hot-reload (using Nodemon):
```bash
pnpm dev
```
The server will be available at `http://localhost:3000`.

### Production
Build the project and start the compiled JavaScript:
```bash
pnpm build
pnpm start
```

## 🧪 Testing

The project uses Jest for testing.

```bash
# Run all tests
pnpm test
```

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `pnpm dev` | Starts the development server with auto-reload. |
| `pnpm build` | Compiles TypeScript source to `dist/`. |
| `pnpm start` | Runs the compiled server from `dist/index.js`. |
| `pnpm test` | Executes Jest tests in the `tests/` directory. |
| `pnpm db:generate` | Generates the Prisma Client. |
| `pnpm db:push` | Pushes schema changes directly to the database (dev only). |
| `pnpm db:migrate` | Creates and applies database migrations (recommended for prod). |
| `pnpm db:studio` | Opens Prisma Studio GUI to explore your data. |

## 🔑 Environment Variables

The application requires several environment variables to function correctly. You can define these in a `.env` file.

| Variable | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | - | **Yes** |
| `JWT_SECRET` | Secret key for signing JWTs | - | **Yes** |
| `PORT` | Port for the Express server | `3000` | No |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `ALLOWED_ORIGINS` | Comma-separated list of CORS origins | `http://localhost:3000` | No |
| `JWT_EXPIRES_IN` | Access token lifespan (e.g., `15m`) | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan (e.g., `7d`) | `7d` | No |
| `MAX_ACTIVE_SESSIONS` | Max concurrent sessions per user | `5` | No |
| `BCRYPT_SALT_ROUNDS` | Cost factor for password hashing | `14` | No |
| `RATE_LIMIT_WINDOW_MS` | Window for rate limiting in ms | `900000` (15m) | No |
| `RATE_LIMIT_MAX_REQUESTS`| Max requests per window | `100` | No |

## 🛣️ API Endpoints

### 🏥 Health Check
- `GET /health` - Service status and uptime.

### 🔐 Authentication (`/api/auth`)
- `POST /register` - Register a new user.
- `POST /login` - Authenticate and receive tokens.
- `POST /refresh` - Get a new access token using a refresh token.
- `POST /logout` - Invalidate current session.
- `POST /logout-all` - Invalidate all active sessions for the user (Auth required).
- `GET /me` - Get current user profile (Auth required).
- `GET /sessions` - List active sessions (Auth required).

### 🏢 Tenants (`/api/tenants`) - *Admin Only*
- `GET /` - List all tenants.
- `GET /:id` - Get tenant details with users.
- `POST /` - Create a new tenant.
- `PUT /:id` - Update tenant metadata.
- `DELETE /:id` - Remove a tenant.
- `POST /users` - Associate a user with a tenant.
- `DELETE /:tenantId/users/:userId` - Disassociate user from tenant.

### 👤 Users (`/api/users`) - *Admin Only*
- `GET /` - List users. Supports optional tenant filtering via `X-Tenant-Id` header.

### 📝 Posts (`/api/posts`) - *Auth & Tenant Required*
- `GET /` - List all posts for the active tenant.
- `GET /:id` - Get specific post.
- `POST /` - Create a post in the active tenant.
- `PUT /:id` - Update post.
- `DELETE /:id` - Delete post.

## 🏗️ Multi-Tenant Architecture

This project implements a **Shared Database, Shared Schema** strategy:
- **Isolation**: Data isolation is enforced at the query level. Most routes require the `X-Tenant-Id` header.
- **Context**: The `tenantMiddleware` extracts the tenant ID from headers and ensures the user has access to that specific tenant.
- **Relationships**: Users can belong to multiple tenants (Many-to-Many).

### The `X-Tenant-Id` Header
- **Required**: For all `/api/posts` operations and tenant-specific filtering.
- **Optional**: For Admin endpoints like `/api/users` to filter by tenant.

## 📄 License

This project is licensed under the **ISC License**. See the `package.json` file for details.