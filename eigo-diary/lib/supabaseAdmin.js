import { createClient } from "@supabase/supabase-js";

// サーバー専用クライアント。service_role キーはブラウザに一切渡さない。
// クライアントから直接 Supabase を読む旧構成（anonキー露出）を廃止するための置き換え。
let cached = null;

export function supabaseAdmin() {
  if (!cached) {
    cached = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return cached;
}
