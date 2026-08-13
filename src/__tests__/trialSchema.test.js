import { TRIAL_TERMS, trialTermsConsistent } from '../config/trialSchema';

const CURRENT_TERMS_HASH =
  '0x36e52079f1f90f70ca72b385e6ab727b3dda223870bed7cd36d79cd5f93632d1';

test('pins the current talent-engine terms release', () => {
  expect(TRIAL_TERMS.termsVersion).toBe('36e52079f1f9');
  expect(TRIAL_TERMS.termsHash).toBe(CURRENT_TERMS_HASH);
  expect(TRIAL_TERMS.termsUri).toContain(
    'docs/terms/prezenti-sponsorship-trial-2026-08-13-v2.md'
  );
});

test('onward commitment is half of Prezenti receipts', () => {
  expect(trialTermsConsistent()).toBe(true);
  expect(TRIAL_TERMS.communityFundBasisPoints * 2).toBe(
    TRIAL_TERMS.giveBackBasisPoints
  );
});
