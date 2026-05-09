# Collaborative Whiteboard

A real-time, collaborative whiteboard application built with Next.js and Supabase. Draw, sketch, and collaborate with others in real-time.

## Features

- **Real-time Collaboration**: See others' strokes instantly as they draw.
- **Persistent Drawings**: All strokes are saved to a Supabase database.
- **Multiple Tools**: Pen, eraser, line, rectangle, and circle tools.
- **User Identity**: Choose a username and get assigned a unique color.
- **Active Users Panel**: See who else is currently collaborating and toggle the visibility of individual users' drawings.
- **Responsive Design**: Works on various screen sizes with a modern UI.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Realtime**: [Supabase](https://supabase.com/)
- **Styling**: [CSS Modules](https://github.com/css-modules/css-modules)
- **Icons**: Custom inline SVGs for optimized performance and control.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- A Supabase project

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd whiteboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   You can use `.env.local.example` as a template.

4. **Database Setup:**
   Run the SQL provided in `supabase/schema.sql` in your Supabase SQL Editor to set up the necessary tables and Row Level Security (RLS) policies.

   Make sure to enable Realtime for the `drawings` and `users` tables in the Supabase Dashboard (Database > Replication).

### Running Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run db:migrate`: (Optional) Custom script for migrations (if implemented in `scripts/migrate.js`).

## Project Structure

- `app/`: Next.js pages and API routes.
- `components/`: React components for the whiteboard UI.
- `lib/`: Utility functions and Supabase client configuration.
- `supabase/`: Database schema and SQL scripts.
- `types/`: TypeScript type definitions.
- `public/`: Static assets.

## License

This project is open-source and available under the [MIT License](LICENSE).
