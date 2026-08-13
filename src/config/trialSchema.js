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
export const PREZENTI_RECIPIENT = '0x8E3C938C5f84F5eCb8355Dc58C0916Ad2610Dbae';
export const COMMUNITY_FUND_RECIPIENT =
  '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972'; // Celo Governance

export const TRIAL_TERMS = {
  programId: 'prezenti-sponsorship-trial',
  sponsorshipValueUsd: 1400,

  // The builder's obligation, in full, and it runs to Prezenti only.
  giveBackBasisPoints: 200, // 2%
  prezentiBasisPoints: 200, // all of it
  // Prezenti's *own* onward commitment.
  communityFundBasisPoints: 100,

  capUsd: 14000, // ten times the sponsorship
  termMonths: 4,
  rofoNoticeDays: 14,

  // 36 months after the cohort ends (29 December 2026) -> 29 December 2029.
  expiresAt: 1893196800,

  coveredIncome:
    'Revenue received through Celo by the sponsored project, and any grant, ' +
    'prize or retro-funding income won with the sponsored work.',

  // The exact wording being agreed to, pinned by content hash. Recompute with:
  //   python3 -c "from web3 import Web3;print(Web3.keccak(open('docs/SPONSORSHIP_TERMS.md','rb').read()).hex())"
  // against prezenti/talent-engine at the commit below.
  termsUri:
    'https://github.com/prezenti/talent-engine/blob/abb0d8d/docs/SPONSORSHIP_TERMS.md',
  termsHash:
    '0x54692e668f82d0155ea573f500692c92f6f6f33e3945dd3182a42bd54f778e42',
  termsCommit: 'abb0d8d1ee4d929ffe747e99264e5563feb00506',
};

export function trialSchemaReady() {
  return (
    typeof TRIAL_SCHEMA_UID === 'string' && TRIAL_SCHEMA_UID.length === 66
  );
}

// The three basis-point figures have to agree or the attestation misstates the
// deal. Checked at render time rather than trusted.
export function trialTermsConsistent() {
  const t = TRIAL_TERMS;
  return (
    t.prezentiBasisPoints === t.giveBackBasisPoints &&
    t.communityFundBasisPoints <= t.giveBackBasisPoints
  );
}
