import React, { useState } from 'react';
import { useConnectWallet } from '@web3-onboard/react';
import Web3 from 'web3';
import {
  TRIAL_SCHEMA_UID,
  EAS_CONTRACT_ADDRESS,
  CELO_CHAIN_ID,
  PREZENTI_RECIPIENT,
  COMMUNITY_FUND_RECIPIENT,
  TRIAL_TERMS,
  trialSchemaReady,
  trialTermsConsistent,
} from '../config/trialSchema';

const EAS_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
          {
            components: [
              { internalType: 'address', name: 'recipient', type: 'address' },
              { internalType: 'uint64', name: 'expirationTime', type: 'uint64' },
              { internalType: 'bool', name: 'revocable', type: 'bool' },
              { internalType: 'bytes32', name: 'refUID', type: 'bytes32' },
              { internalType: 'bytes', name: 'data', type: 'bytes' },
              { internalType: 'uint256', name: 'value', type: 'uint256' },
            ],
            internalType: 'struct AttestationRequestData',
            name: 'data',
            type: 'tuple',
          },
        ],
        internalType: 'struct AttestationRequest',
        name: 'request',
        type: 'tuple',
      },
    ],
    name: 'attest',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

// Mirrors the registered schema exactly. If these drift, the attestation
// encodes bytes nothing can decode -- which is what happened to all 29
// attestations under the original schema.
const SCHEMA_TYPES = [
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

function pct(bp) {
  return `${bp / 100}%`;
}

function TrialPledge() {
  const [{ wallet }, connect] = useConnectWallet();
  const [handle, setHandle] = useState('');
  const [monthsFunded, setMonthsFunded] = useState(TRIAL_TERMS.termMonths);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uid, setUid] = useState(null);
  const [txHash, setTxHash] = useState(null);

  // Fail closed. Signing trial terms into the wrong schema would produce
  // another batch of attestations that say the wrong thing.
  if (!trialSchemaReady() || !trialTermsConsistent()) {
    return (
      <div className="pledge-container">
        <h2>Trial pledge unavailable</h2>
        <p>
          The trial schema is not configured, or the give-back figures do not
          agree with each other. Nothing will be signed until that is fixed.
        </p>
      </div>
    );
  }

  const obligation =
    (TRIAL_TERMS.giveBackBasisPoints * monthsFunded) /
    TRIAL_TERMS.termMonths /
    100;

  const sign = async () => {
    setError(null);
    if (!wallet) return connect();
    if (!handle.trim()) return setError('Your GitHub handle is required.');
    if (!agreed) return setError('You need to accept the terms to sign.');

    setLoading(true);
    try {
      const web3 = new Web3(wallet.provider);
      const chainId = Number(await web3.eth.getChainId());
      if (chainId !== CELO_CHAIN_ID) {
        throw new Error(`Wrong network: connect to Celo (chain ${CELO_CHAIN_ID}).`);
      }
      const from = wallet.accounts[0].address;

      const values = [
        TRIAL_TERMS.programId,
        handle.trim().replace(/^@/, ''),
        TRIAL_TERMS.sponsorshipValueUsd,
        TRIAL_TERMS.giveBackBasisPoints,
        PREZENTI_RECIPIENT,
        TRIAL_TERMS.prezentiBasisPoints,
        COMMUNITY_FUND_RECIPIENT,
        TRIAL_TERMS.communityFundBasisPoints,
        TRIAL_TERMS.capUsd,
        TRIAL_TERMS.expiresAt,
        Number(monthsFunded),
        TRIAL_TERMS.coveredIncome,
        TRIAL_TERMS.rofoNoticeDays,
        TRIAL_TERMS.termsUri,
        TRIAL_TERMS.termsHash,
      ];
      const data = web3.eth.abi.encodeParameters(SCHEMA_TYPES, values);

      const eas = new web3.eth.Contract(EAS_ABI, EAS_CONTRACT_ADDRESS);
      const request = {
        schema: TRIAL_SCHEMA_UID,
        data: {
          recipient: PREZENTI_RECIPIENT,
          expirationTime: 0,
          revocable: true,
          refUID:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          data,
          value: 0,
        },
      };
      const receipt = await eas.methods.attest(request).send({ from });
      setTxHash(receipt.transactionHash);
      const log = receipt.logs?.find(
        (l) => l.address?.toLowerCase() === EAS_CONTRACT_ADDRESS.toLowerCase()
      );
      setUid(log?.topics?.[1] || null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  if (uid) {
    return (
      <div className="pledge-container">
        <h2>Pledge recorded</h2>
        <p>
          Attestation{' '}
          <a
            href={`https://celo.easscan.org/attestation/view/${uid}`}
            target="_blank"
            rel="noreferrer"
          >
            {uid.slice(0, 10)}…{uid.slice(-6)}
          </a>
        </p>
        {txHash && (
          <p>
            <a
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          </p>
        )}
        <p>
          It is revocable. If you withdraw from the programme, the recorded
          months determine what is owed, and the attestation can be closed out.
        </p>
      </div>
    );
  }

  return (
    <div className="pledge-container">
      <h2>AI Builder Sponsorships — give-back pledge</h2>

      <div className="info-section">
        <p>
          This records a good-faith commitment. It is <strong>not</strong> a
          contract, creates no security interest, no debt and no equity, and
          gives Prezenti no claim over your company. Enforcement is
          reputational: the pledge is public, and so is whether it was honoured.
        </p>
        <ul>
          <li>
            <strong>{pct(TRIAL_TERMS.giveBackBasisPoints)}</strong> of Celo
            revenue and grant, prize or retro-funding income from the sponsored
            work — owed to Prezenti and to nobody else.
          </li>
          <li>
            Prezenti separately commits to routing{' '}
            <strong>{pct(TRIAL_TERMS.communityFundBasisPoints)}</strong> of what
            it receives onward to the Celo Community Fund. That is Prezenti's
            promise, not yours.
          </li>
          <li>
            Capped at <strong>${TRIAL_TERMS.capUsd.toLocaleString()}</strong>,
            ten times the sponsorship.
          </li>
          <li>
            Expires{' '}
            {new Date(TRIAL_TERMS.expiresAt * 1000).toISOString().slice(0, 10)}.
          </li>
          <li>
            Pro-rated by months you actually take. Leave early and you owe
            proportionally less.
          </li>
          <li>
            Right of first <em>offer</em> on a future round, with{' '}
            {TRIAL_TERMS.rofoNoticeDays} days' notice. Never an obligation on
            you.
          </li>
        </ul>
        <p>
          Full terms:{' '}
          <a href={TRIAL_TERMS.termsUri} target="_blank" rel="noreferrer">
            SPONSORSHIP_TERMS.md
          </a>{' '}
          — pinned by content hash, so the words recorded on-chain cannot change
          under you.
        </p>
      </div>

      <label>
        Your GitHub handle
        <input
          type="text"
          value={handle}
          placeholder="octocat"
          onChange={(e) => setHandle(e.target.value)}
        />
      </label>

      <label>
        Months funded at signing
        <select
          value={monthsFunded}
          onChange={(e) => setMonthsFunded(Number(e.target.value))}
        >
          {Array.from({ length: TRIAL_TERMS.termMonths + 1 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </label>

      <p>
        On {monthsFunded} of {TRIAL_TERMS.termMonths} months, the pledge is{' '}
        <strong>{obligation}%</strong>, capped at $
        {TRIAL_TERMS.capUsd.toLocaleString()}.
      </p>

      <label>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />{' '}
        I have read the terms and make this commitment in good faith.
      </label>

      {error && <p className="error">{error}</p>}

      <button onClick={sign} disabled={loading} className="connect-button">
        {loading
          ? 'Signing…'
          : wallet
          ? 'Sign the pledge'
          : 'Connect wallet'}
      </button>
    </div>
  );
}

export default TrialPledge;
