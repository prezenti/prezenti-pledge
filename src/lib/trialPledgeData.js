import { ethers } from 'ethers';

// Mirrors the registered trial schema exactly. Both the signing flow and the
// public pledgor list use this array so encoding and decoding cannot drift.
export const TRIAL_SCHEMA_TYPES = [
  { name: 'programId', type: 'string' },
  { name: 'recipientHandle', type: 'string' },
  { name: 'sponsorshipValueUsd', type: 'uint256' },
  { name: 'giveBackBasisPoints', type: 'uint16' },
  { name: 'prezentiRecipient', type: 'address' },
  { name: 'prezentiBasisPoints', type: 'uint16' },
  { name: 'communityFundRecipient', type: 'address' },
  { name: 'communityFundBasisPoints', type: 'uint16' },
  { name: 'capUsd', type: 'uint256' },
  { name: 'expiresAt', type: 'uint64' },
  { name: 'monthsFundedAtSigning', type: 'uint8' },
  { name: 'coveredIncome', type: 'string' },
  { name: 'rofoNoticeDays', type: 'uint16' },
  { name: 'termsUri', type: 'string' },
  { name: 'termsHash', type: 'bytes32' },
];

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value);
}

export function decodeTrialPledgeData(data) {
  try {
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      TRIAL_SCHEMA_TYPES,
      data
    );
    return {
      programId: decoded[0],
      recipientHandle: decoded[1],
      sponsorshipValueUsd: toNumber(decoded[2]),
      giveBackBasisPoints: toNumber(decoded[3]),
      prezentiRecipient: decoded[4],
      prezentiBasisPoints: toNumber(decoded[5]),
      communityFundRecipient: decoded[6],
      communityFundBasisPoints: toNumber(decoded[7]),
      capUsd: toNumber(decoded[8]),
      expiresAt: toNumber(decoded[9]),
      monthsFundedAtSigning: toNumber(decoded[10]),
      coveredIncome: decoded[11],
      rofoNoticeDays: toNumber(decoded[12]),
      termsUri: decoded[13],
      termsHash: decoded[14],
    };
  } catch (e) {
    return null;
  }
}

export function shortenHex(value, left = 6, right = 4) {
  if (!value || value.length <= left + right + 3) return value || '';
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export function formatUnixDate(seconds) {
  const n = toNumber(seconds);
  if (!n) return 'Unknown';
  return new Date(n * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function normalizeTrialAttestation(attestation, nowSeconds = Date.now() / 1000) {
  const pledge = decodeTrialPledgeData(attestation.data);
  if (!pledge) return null;

  const expirationTime =
    toNumber(attestation.expirationTime) || pledge.expiresAt;
  const revocationTime = toNumber(attestation.revocationTime);
  const revoked = Boolean(attestation.revoked) || revocationTime > 0;
  const expired = Boolean(expirationTime) && expirationTime <= nowSeconds;

  return {
    uid: attestation.id,
    attester: attestation.attester,
    recipient: attestation.recipient,
    signedAt: toNumber(attestation.time),
    expirationTime,
    revocationTime,
    status: revoked ? 'Revoked' : expired ? 'Expired' : 'Active',
    transactionHash: attestation.transactionHash || '',
    pledge,
  };
}
