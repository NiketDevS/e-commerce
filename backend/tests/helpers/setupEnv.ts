import 'dotenv/config';

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
if (process.env.DIRECT_URL_TEST) {
  process.env.DIRECT_URL = process.env.DIRECT_URL_TEST;
}
