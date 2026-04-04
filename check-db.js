require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`
  CREATE TABLE IF NOT EXISTS user_notes (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    term TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`.then(() => console.log('Notes table created!')).catch(console.error);