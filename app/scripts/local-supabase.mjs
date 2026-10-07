// Connection details of the local Supabase stack, read from the CLI so nothing is copied into the repo.
import { execFileSync } from 'node:child_process';

export function localSupabase() {
  const s = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }));
  return {
    url: s.API_URL,
    publishableKey: s.PUBLISHABLE_KEY,
    secretKey: s.SECRET_KEY,
    mailpitUrl: s.MAILPIT_URL,
  };
}
