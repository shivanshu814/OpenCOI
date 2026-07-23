# Backup & restore test checklist (Week 6 ops)

Run monthly. Log date + who ran it in founder ops notes (not in git).

## Daily (automated — verify in Supabase dashboard)

- [ ] Supabase project → Database → Backups: PITR / daily backup present (US region)
- [ ] Storage bucket `cois` included in backup scope or separate export schedule noted

## Monthly restore drill

1. [ ] Create a **throwaway** Supabase branch / restore-to-new-project from latest backup (never overwrite prod)
2. [ ] Confirm `orgs`, `vendors`, `documents`, `extractions`, `audit_events` row counts match expectations (± small drift)
3. [ ] Download one COI from Storage via restored project
4. [ ] Spot-check RLS: anon key cannot read another org’s vendors
5. [ ] Record RPO (backup age) and RTO (time to usable restore) in ops log
6. [ ] Tear down throwaway project

## App-side exports (customer-facing, not a DB restore)

- [ ] Vendor litigation pack ZIP downloads
- [ ] Property audit pack ZIP downloads

## Pass criteria

- Restore completed without data loss for sampled rows
- RTO documented; if &gt; 4h, file follow-up with Supabase plan upgrade
