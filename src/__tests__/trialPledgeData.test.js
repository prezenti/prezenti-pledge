import { ethers } from 'ethers';
import {
  decodeTrialPledgeData,
  normalizeTrialAttestation,
  shortenHex,
  TRIAL_SCHEMA_TYPES,
} from '../lib/trialPledgeData';

const SAMPLE_VALUES = [
  'prezenti-sponsorship-trial',
  'spagero763',
  1400,
  200,
  '0xA5c9389A0Ce1bFe24FF883E761Ff313225C77D44',
  200,
  '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972',
  100,
  14000,
  1893196800,
  0,
  'revenue actually received by the product through Celo',
  14,
  'https://github.com/prezenti/talent-engine/blob/main/docs/terms/prezenti-sponsorship-trial-2026-08-14-v3.md',
  '0xac1bffe5f24b5f88031afec9bfdbd58af43908a666c0aed114895b487b28445c',
];

function encodedSample() {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    TRIAL_SCHEMA_TYPES,
    SAMPLE_VALUES
  );
}

test('decodes a trial pledge attestation payload', () => {
  const decoded = decodeTrialPledgeData(encodedSample());
  expect(decoded.recipientHandle).toBe('spagero763');
  expect(decoded.giveBackBasisPoints).toBe(200);
  expect(decoded.capUsd).toBe(14000);
  expect(decoded.monthsFundedAtSigning).toBe(0);
  expect(decoded.termsHash).toBe(SAMPLE_VALUES[14]);
});

test('normalizes EAS attestation rows for display', () => {
  const record = normalizeTrialAttestation(
    {
      id: '0x' + 'ab'.repeat(32),
      attester: '0x' + 'cd'.repeat(20),
      recipient: SAMPLE_VALUES[4],
      data: encodedSample(),
      time: '1790000000',
      expirationTime: '1893196800',
      revocationTime: '0',
      revoked: false,
    },
    1800000000
  );

  expect(record.status).toBe('Active');
  expect(record.pledge.recipientHandle).toBe('spagero763');
  expect(record.signedAt).toBe(1790000000);
});

test('marks revoked rows and ignores undecodable rows', () => {
  const revoked = normalizeTrialAttestation({
    id: '0x' + '12'.repeat(32),
    attester: '0x' + '34'.repeat(20),
    recipient: SAMPLE_VALUES[4],
    data: encodedSample(),
    time: '1790000000',
    expirationTime: '1893196800',
    revocationTime: '1790000100',
    revoked: false,
  });

  expect(revoked.status).toBe('Revoked');
  expect(normalizeTrialAttestation({ data: '0xdeadbeef' })).toBeNull();
});

test('shortens long hex strings for compact ledger rows', () => {
  expect(shortenHex('0x' + 'ab'.repeat(32), 8, 6)).toBe(
    '0xababab...ababab'
  );
});
