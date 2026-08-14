import fs from 'fs';
import path from 'path';

test('initial pledge does not ask the builder to choose months funded', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'TrialPledge.js'),
    'utf8'
  );
  expect(source).not.toContain('Months funded at signing');
  expect(source).not.toContain('setMonthsFunded');
  expect(source.replace(/\s+/g, ' ')).toContain(
    'actual months funded are recorded later'
  );
});

test('pledge copy states the onward commitment correctly', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'TrialPledge.js'),
    'utf8'
  );
  expect(source).toContain('TRIAL_TERMS.coveredIncome');
  expect(source).toContain('half of what it receives');
  expect(source).toContain('covered income');
  expect(source).toContain('No 0xSplits collector');
});

test('close-out flow separates replacement from revoke-only retry', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'TrialPledge.js'),
    'utf8'
  );
  expect(source).toContain('Sign replacement');
  expect(source).toContain('Revoke original');
  expect(source).toContain('Replacement attestation UID');
  expect(source).not.toContain('Sign replacement and revoke original');
  expect(source).toContain('attest(attestationRequest(data, originalUid))');
  expect(source).toContain('revoke(revocationRequest(originalUid))');
});
