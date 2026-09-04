// One-time (or one-per-deploy) registration of the Telegram webhook URL.
// Run with: npm run telegram:set-webhook
//
// Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and PUBLIC_API_URL from
// .env and tells Telegram to POST updates to <PUBLIC_API_URL>/api/telegram/webhook,
// echoing TELEGRAM_WEBHOOK_SECRET back on every call so telegram-webhook.guard.ts
// can verify the request actually came from Telegram.
// Node's built-in .env loader (no dotenv dependency needed) - available
// since Node 20.6, stable in the Node 22 this project targets.
try {
  process.loadEnvFile();
} catch {
  // no .env file present - fine if these are already set in the environment
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const publicApiUrl = process.env.PUBLIC_API_URL;

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in .env');
  if (!secret) throw new Error('TELEGRAM_WEBHOOK_SECRET is not set in .env');
  if (!publicApiUrl) throw new Error('PUBLIC_API_URL is not set in .env');

  const webhookUrl = `${publicApiUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
  });
  const result = await res.json();

  if (!result.ok) {
    console.error('Telegram rejected setWebhook:', result);
    process.exit(1);
  }
  console.log(`Webhook registered: ${webhookUrl}`);
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
