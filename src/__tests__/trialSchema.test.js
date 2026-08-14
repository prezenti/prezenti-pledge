import { TRIAL_TERMS, trialTermsConsistent } from '../config/trialSchema';

const CURRENT_TERMS_HASH =
  '0xac1bffe5f24b5f88031afec9bfdbd58af43908a666c0aed114895b487b28445c';

test('pins the current talent-engine terms release', () => {
  expect(TRIAL_TERMS.termsVersion).toBe('ac1bffe5f24b');
  expect(TRIAL_TERMS.termsHash).toBe(CURRENT_TERMS_HASH);
  expect(TRIAL_TERMS.termsUri).toContain(
    'docs/terms/prezenti-sponsorship-trial-2026-08-14-v3.md'
  );
});

test('onward commitment is half of Prezenti receipts', () => {
  expect(trialTermsConsistent()).toBe(true);
  expect(TRIAL_TERMS.communityFundBasisPoints * 2).toBe(
    TRIAL_TERMS.giveBackBasisPoints
  );
});
