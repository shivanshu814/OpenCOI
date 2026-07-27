import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const EMAIL = "zz-perf-bench@example.com";
const PASS = "BenchPassw0rd!x9";
async function main() {
  const orgId = fs.readFileSync("/tmp/bench-org-id", "utf8").trim();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email === EMAIL);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASS, email_confirm: true,
  });
  if (error) throw error;
  const uid = created.user!.id;
  const { error: me } = await admin.from("org_members").insert({ org_id: orgId, user_id: uid, role: "owner" });
  if (me) throw me;
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sess, error: se } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (se) throw se;
  fs.writeFileSync("/tmp/bench-jwt", sess.session!.access_token);
  fs.writeFileSync("/tmp/bench-user-id", uid);
  console.log("USER", uid, "jwt len", sess.session!.access_token.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
