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
- `GET /` - Welcome message
- `GET /health` - Health check endpoint

### Users
- `GET /users` - Get all users with their posts
- `POST /users` - Create a new user
  ```json
  {
    "email": "user@example.com",
    "name": "John Doe"
  }
  ```

### Posts
- `GET /posts` - Get all posts with authors
- `POST /posts` - Create a new post
  ```json
  {
    "title": "My Post",
    "content": "Post content here",
    "authorId": 1
  }
  ```

## Database Schema

The project includes example models:

- **User**: Basic user model with email, name, and timestamps
- **Post**: Blog post model with title, content, author relation, and timestamps

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