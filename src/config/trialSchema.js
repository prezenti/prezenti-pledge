// Trial give-back pledge configuration.
//
// TRIAL_SCHEMA_UID is empty until the schema in docs/TRIAL_PLEDGE_SCHEMA.md is
// registered on Celo. The trial flow checks for it and refuses to render
// without it: writing trial terms into the old generic schema would produce
// another batch of attestations that say the wrong thing and cannot be revoked,
// which is the exact failure this file exists to prevent.

export const TRIAL_SCHEMA_UID = '';

export const TRIAL_TERMS = {
  programId: 'prezenti-sponsorship-trial',
  giveBackBasisPoints: 200,          // 2% total
  prezentiBasisPoints: 100,          // 1% to Prezenti
  communityFundBasisPoints: 100,     // 1% to the Celo Community Fund
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
