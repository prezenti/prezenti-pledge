import { TRIAL_TERMS, trialTermsConsistent } from '../config/trialSchema';

const CURRENT_TERMS_HASH =
  '0x33487d54a6719e9976731f5959d0dd4cf17e7a17abde347922461ca3fa022fe6';

test('pins the current talent-engine terms release', () => {
  expect(TRIAL_TERMS.termsVersion).toBe('33487d54a671');
  expect(TRIAL_TERMS.termsHash).toBe(CURRENT_TERMS_HASH);
  expect(TRIAL_TERMS.termsUri).toContain(
    'docs/terms/prezenti-sponsorship-trial-2026-08-13.md'
  );
});

test('onward commitment is half of Prezenti receipts', () => {
  expect(trialTermsConsistent()).toBe(true);
  expect(TRIAL_TERMS.communityFundBasisPoints * 2).toBe(
    TRIAL_TERMS.giveBackBasisPoints
  );
});
