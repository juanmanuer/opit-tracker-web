require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`
  CREATE TABLE IF NOT EXISTS user_practices (
    email TEXT NOT NULL,
    practice_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (email, practice_id)
  )
`.then(() => console.log('Table created!')).catch(console.error);