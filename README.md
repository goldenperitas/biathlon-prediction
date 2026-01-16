# Hit or Miss

Predict biathlon podiums and compete with friends.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Prerequisites

- Node.js 20+ and npm
- A Supabase account and project

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/goldenperitas/biathlon-prediction.git
   cd biathlon-prediction
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` and add your Supabase credentials:
   - Get your `NEXT_PUBLIC_SUPABASE_URL` from Supabase Dashboard > Settings > API > Project URL
   - Get your `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase Dashboard > Settings > API > Project API keys > anon public

4. **Set up the database**
   - Run the SQL schema from `sql/prediction_v2_schema.sql` in your Supabase SQL Editor

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3100](http://localhost:3100)

## Documentation

See [docs/PROJECT.md](docs/PROJECT.md) for detailed project documentation, API reference, and roadmap.
