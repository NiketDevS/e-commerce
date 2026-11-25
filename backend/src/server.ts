import 'dotenv/config';
import { app } from './app';

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

app.listen(port, () => {
  process.stdout.write(`Support API listening on port ${port}\n`);
});
