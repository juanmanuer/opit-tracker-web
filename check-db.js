require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'grade_scores'`
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(console.error);