// Trial give-back pledge configuration.
//
// TRIAL_SCHEMA_UID is empty until the schema in docs/TRIAL_PLEDGE_SCHEMA.md is
// registered on Celo. The trial flow checks for it and refuses to render
// without it: writing trial terms into the old generic schema would produce
// another batch of attestations that say the wrong thing and cannot be revoked,
// which is the exact failure this file exists to prevent.

export const TRIAL_SCHEMA_UID =
  '0x6a5f8c4f58911419d3ae8a67df4f342eea92c0d2167b5b814eaa6d450e9135f4';

export const TRIAL_TERMS = {
  programId: 'prezenti-sponsorship-trial',
  // The builder's obligation, in full, and it runs to Prezenti only.
  giveBackBasisPoints: 200,          // 2%
  prezentiBasisPoints: 200,          // all of it
  // Prezenti's *own* onward commitment: half of what it receives is routed to
  // the Celo Community Fund. Recorded here so it is as public as the builder's
  // half, but it is not something the builder owes the Fund.
  communityFundBasisPoints: 100,
  capUsd: 14000,                     // ten times the sponsorship
  rofoNoticeDays: 14,
  coveredIncome:
    'Revenue received through Celo by the sponsored project, and any grant or ' +
    'prize income won with the sponsored work.',
  termsUri:
    'https://github.com/prezenti/talent-engine/blob/main/docs/SPONSORSHIP_TERMS.md',
};

export function trialSchemaReady() {
  return typeof TRIAL_SCHEMA_UID === 'string' && TRIAL_SCHEMA_UID.length === 66;
}
