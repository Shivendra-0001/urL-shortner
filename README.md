# URL Shortener

A minimal URL shortener built with Node.js, Express, and PostgreSQL.

## Features

- ✂️ Shorten long URLs
- 📊 View click statistics
- 🗑️ Manage and delete links
- 🎨 Clean UI with Tailwind CSS

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   - Create a free PostgreSQL database on [Neon](https://neon.tech)
   - Copy `.env.example` to `.env`
   - Add your database URL to `.env`:
     ```
     DATABASE_URL=postgresql://user:password@host/database
     PORT=3000
     BASE_URL=http://localhost:3000
     ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

## Deployment

### Vercel/Render/Railway

1. Push code to GitHub
2. Connect repository to hosting platform
3. Add environment variables:
   - `DATABASE_URL` (from Neon)
   - `BASE_URL` (your deployed URL)
4. Deploy

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon)
- **Frontend:** HTML + Tailwind CSS
- **URL Generation:** nanoid

## API Endpoints

- `POST /api/shorten` - Create short URL
- `GET /api/urls` - Get all URLs with stats
- `DELETE /api/urls/:shortCode` - Delete URL
- `GET /:shortCode` - Redirect to original URL
