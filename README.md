# Mini-MT Express + TypeScript + Prisma Server

A modern Express.js server built with TypeScript and Prisma ORM, using pnpm for package management.

## Features

- **Express.js** - Fast, unopinionated web framework for Node.js
- **TypeScript** - Type-safe JavaScript with modern features
- **Prisma ORM** - Next-generation database toolkit
- **pnpm** - Fast, disk space efficient package manager
- **Nodemon** - Auto-restart development server
- **PostgreSQL** - Robust relational database

## Project Structure

```
mini-mt/
├── src/
│   └── index.ts          # Main server file
├── prisma/
│   └── schema.prisma     # Database schema
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── nodemon.json          # Nodemon configuration
├── prisma.config.ts      # Prisma configuration
└── .env                  # Environment variables
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mini-mt
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your database:
   - Update the `DATABASE_URL` in `.env` file with your PostgreSQL connection string
   - Or use the provided Prisma Postgres URL for development

4. Generate Prisma client:
```bash
pnpm db:generate
```

5. Push the schema to your database:
```bash
pnpm db:push
```

### Development

Start the development server with hot reload:
```bash
pnpm dev
```

The server will start on `http://localhost:3000`

### Production

1. Build the project:
```bash
pnpm build
```

2. Start the production server:
```bash
pnpm start
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build the project for production
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio (database GUI)

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Multi-Tenant Features

#### Tenants (Admin only)
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get tenant by ID with users
- `POST /api/tenants` - Create a new tenant
  ```json
  {
    "name": "Company ABC",
    "slug": "company-abc",
    "description": "Description of the tenant"
  }
  ```
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

#### Tenant-User Management (Admin only)
- `POST /api/tenants/users` - Add user to tenant
  ```json
  {
    "userId": 1,
    "tenantId": 1
  }
  ```
- `DELETE /api/tenants/:tenantId/users/:userId` - Remove user from tenant

### Users (Admin only)
- `GET /api/users` - Get all users (supports tenant filtering with X-Tenant-Id header)
  - Without X-Tenant-Id: Returns all users with their tenant associations
  - With X-Tenant-Id: Returns only users belonging to that tenant

### Multi-Tenant Headers
All API requests can include the `X-Tenant-Id` header to specify tenant context:
```
X-Tenant-Id: 1
```

**Required for:**
- Tenant-specific operations (when middleware enforces it)

**Optional for:**
- Admin operations (provides filtering context)
- Tenant management endpoints

## Database Schema

The project includes the following models:

- **User**: User model with email, name, password, role, and timestamps
- **Post**: Blog post model with title, content, author relation, and timestamps  
- **Tenant**: Multi-tenant model with name, slug, description, and active status
- **UserTenant**: Junction table for many-to-many relationship between users and tenants
- **Session**: User session management with tokens and device info

### Multi-Tenant Architecture

The multi-tenant system uses a **shared database, separate schema** approach:
- All tenants share the same database and tables
- Data isolation is achieved through tenant-specific filtering
- Users can belong to multiple tenants (many-to-many relationship)
- The `X-Tenant-Id` header determines the tenant context for requests

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="your-postgresql-connection-string"
PORT=3000
```

## Technologies Used

- **Express.js** - Web framework
- **TypeScript** - Programming language
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **pnpm** - Package manager
- **Nodemon** - Development tool
- **ts-node** - TypeScript execution engine

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.