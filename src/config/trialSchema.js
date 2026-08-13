// Trial give-back pledge configuration.
//
// The schema is registered on Celo mainnet and immutable. Everything below
// that is a *term* rather than a field is pinned here so the values written
// on-chain come from one reviewed place rather than from whatever a form
// happened to contain.

export const TRIAL_SCHEMA_UID =
  '0x6a5f8c4f58911419d3ae8a67df4f342eea92c0d2167b5b814eaa6d450e9135f4';

// EAS on Celo. Same contract the generic pledge uses.
export const EAS_CONTRACT_ADDRESS = '0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92';
export const CELO_CHAIN_ID = 42220;

// Where the two legs go. `PREZENTI_RECIPIENT` is the only party the builder
// owes anything to. `COMMUNITY_FUND_RECIPIENT` records Prezenti's own onward
// commitment to route half of what it receives to the Celo Community Fund --
// it is published so that promise is as visible as the builder's, not because
// the builder owes the Fund.
// MUST be Prezenti's currently approved long-lived Safe/multisig.
// Deliberately empty: the previous value (0x8E3C938C…10Dbae) is Prezenti's
// historical hot/swap wallet, slated for retirement. It proved historical
// control, which is not the same as being a suitable counterparty for a
// 36-month commitment. `trialSchemaReady()` returns false while this is unset,
// so nothing can be signed against a wallet nobody approved.
export const PREZENTI_RECIPIENT = '0xA5c9389A0Ce1bFe24FF883E761Ff313225C77D44';
export const COMMUNITY_FUND_RECIPIENT =
  '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972'; // Celo Governance

export const TRIAL_TERMS = {
  programId: 'prezenti-sponsorship-trial',
  sponsorshipValueUsd: 1400,

  // The builder's obligation, in full, and it runs to Prezenti only.
  giveBackBasisPoints: 200, // 2%
  prezentiBasisPoints: 200, // all of it
  // Prezenti's *own* onward commitment, expressed as bps of covered income:
  // half of Prezenti's 2% receipts is equivalent to 1% of covered income.
  communityFundBasisPoints: 100,

  capUsd: 14000, // ten times the sponsorship
  termMonths: 4,
  rofoNoticeDays: 14,

  // The cohort end is the source of truth; the expiry is derived from it and
  // checked below, rather than being a magic constant that silently stops
  // matching if the dates move.
  cohortEnd: '2026-12-29',
  sunsetMonths: 36,

  coveredIncome:
    'revenue actually received by the product through Celo, and any grant, ' +
    'prize and retro-funding income won with the sponsored work.',

  // The exact wording being agreed to, pinned by the same SHA-256 release hash
  // that talent-engine stamps into the Tally acceptance option.
  termsUri:
    'https://github.com/prezenti/talent-engine/blob/main/docs/terms/prezenti-sponsorship-trial-2026-08-13-v2.md',
  termsHash:
    '0x36e52079f1f90f70ca72b385e6ab727b3dda223870bed7cd36d79cd5f93632d1',
  termsVersion: '36e52079f1f9',
};

// 36 months after the cohort end, as a Unix timestamp. Derived rather than
// hardcoded so the schema field and the native EAS expiration cannot disagree
// with the programme calendar.
export function expiresAt() {
  const end = new Date(`${TRIAL_TERMS.cohortEnd}T00:00:00Z`);
  const out = new Date(end);
  out.setUTCMonth(out.getUTCMonth() + TRIAL_TERMS.sunsetMonths);
  return Math.floor(out.getTime() / 1000);
}

export function isAddress(a) {
  return typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
}

export function trialSchemaReady() {
  return (
    typeof TRIAL_SCHEMA_UID === 'string' &&
    TRIAL_SCHEMA_UID.length === 66 &&
    isAddress(PREZENTI_RECIPIENT) &&
    isAddress(COMMUNITY_FUND_RECIPIENT) &&
    Number.isFinite(expiresAt()) &&
    expiresAt() > Math.floor(Date.now() / 1000)
  );
}

// The basis-point figures have to agree or the attestation misstates the deal.
// Checked at render time rather than trusted.
export function trialTermsConsistent() {
  const t = TRIAL_TERMS;
  return (
    t.prezentiBasisPoints === t.giveBackBasisPoints &&
    t.communityFundBasisPoints * 2 === t.giveBackBasisPoints
  );
}
