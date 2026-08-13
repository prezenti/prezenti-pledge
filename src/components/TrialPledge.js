import React, { useState } from 'react';
import { useConnectWallet } from '@web3-onboard/react';
import Web3 from 'web3';
import { ATTESTED_EVENT_ABI, uidFromReceipt } from '../lib/attestation';
import {
  TRIAL_SCHEMA_UID,
  EAS_CONTRACT_ADDRESS,
  CELO_CHAIN_ID,
  PREZENTI_RECIPIENT,
  COMMUNITY_FUND_RECIPIENT,
  TRIAL_TERMS,
  trialSchemaReady,
  trialTermsConsistent,
  expiresAt,
} from '../config/trialSchema';

const ZERO_UID =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const UID_RE = /^0x[0-9a-fA-F]{64}$/;

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
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'schema', type: 'bytes32' },
          {
            components: [
              { internalType: 'bytes32', name: 'uid', type: 'bytes32' },
              { internalType: 'uint256', name: 'value', type: 'uint256' },
            ],
            internalType: 'struct RevocationRequestData',
            name: 'data',
            type: 'tuple',
          },
        ],
        internalType: 'struct RevocationRequest',
        name: 'request',
        type: 'tuple',
      },
    ],
    name: 'revoke',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  ATTESTED_EVENT_ABI,
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

function cleanHandle(value) {
  return value.trim().replace(/^@/, '');
}

function encodeTrialData(web3, handle, monthsFunded) {
  const values = [
    TRIAL_TERMS.programId,
    handle,
    TRIAL_TERMS.sponsorshipValueUsd,
    TRIAL_TERMS.giveBackBasisPoints,
    PREZENTI_RECIPIENT,
    TRIAL_TERMS.prezentiBasisPoints,
    COMMUNITY_FUND_RECIPIENT,
    TRIAL_TERMS.communityFundBasisPoints,
    TRIAL_TERMS.capUsd,
    expiresAt(),
    monthsFunded,
    TRIAL_TERMS.coveredIncome,
    TRIAL_TERMS.rofoNoticeDays,
    TRIAL_TERMS.termsUri,
    TRIAL_TERMS.termsHash,
  ];
  return web3.eth.abi.encodeParameters(SCHEMA_TYPES, values);
}

function attestationRequest(data, refUID = ZERO_UID) {
  return {
    schema: TRIAL_SCHEMA_UID,
    data: {
      recipient: PREZENTI_RECIPIENT,
      // The attestation itself must expire, not just carry a field saying it
      // does. Leaving this at 0 made the on-chain object perpetual while the
      // schema claimed a 36-month sunset.
      expirationTime: expiresAt(),
      revocable: true,
      refUID,
      data,
      value: 0,
    },
  };
}

function revocationRequest(uid) {
  return {
    schema: TRIAL_SCHEMA_UID,
    data: { uid, value: 0 },
  };
}

function TrialPledge() {
  const [{ wallet }, connect] = useConnectWallet();
  const [handle, setHandle] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uid, setUid] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const [closeoutHandle, setCloseoutHandle] = useState('');
  const [originalUid, setOriginalUid] = useState('');
  const [monthsFunded, setCloseoutMonthsFunded] = useState('');
  const [closeoutAgreed, setCloseoutAgreed] = useState(false);
  const [closeoutLoading, setCloseoutLoading] = useState(false);
  const [closeoutError, setCloseoutError] = useState(null);
  const [replacementUid, setReplacementUid] = useState(null);
  const [revocationTxHash, setRevocationTxHash] = useState(null);

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

  const fullTermObligation = TRIAL_TERMS.giveBackBasisPoints / 100;

  const walletWeb3 = async () => {
    if (!wallet) {
      await connect();
      return null;
    }
    const web3 = new Web3(wallet.provider);
    const chainId = Number(await web3.eth.getChainId());
    if (chainId !== CELO_CHAIN_ID) {
      throw new Error(`Wrong network: connect to Celo (chain ${CELO_CHAIN_ID}).`);
    }
    return web3;
  };

  const sign = async () => {
    setError(null);
    const clean = cleanHandle(handle);
    if (!clean) return setError('Your GitHub handle is required.');
    if (!agreed) return setError('You need to accept the terms to sign.');

    setLoading(true);
    try {
      const web3 = await walletWeb3();
      if (!web3) return;
      const from = wallet.accounts[0].address;
      const data = encodeTrialData(web3, clean, 0);
      const eas = new web3.eth.Contract(EAS_ABI, EAS_CONTRACT_ADDRESS);
      const receipt = await eas.methods.attest(attestationRequest(data)).send({ from });
      setTxHash(receipt.transactionHash);
      setUid(uidFromReceipt(receipt, EAS_CONTRACT_ADDRESS));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const closeOut = async () => {
    setCloseoutError(null);
    setReplacementUid(null);
    setRevocationTxHash(null);

    const clean = cleanHandle(closeoutHandle);
    const months = Number(monthsFunded);
    if (!clean) return setCloseoutError('Your GitHub handle is required.');
    if (!UID_RE.test(originalUid)) return setCloseoutError('Original attestation UID is required.');
    if (!Number.isInteger(months) || months < 0 || months > TRIAL_TERMS.termMonths) {
      return setCloseoutError(`Months funded must be 0-${TRIAL_TERMS.termMonths}.`);
    }
    if (!closeoutAgreed) {
      return setCloseoutError('Confirm that the months funded value is final.');
    }

    setCloseoutLoading(true);
    try {
      const web3 = await walletWeb3();
      if (!web3) return;
      const from = wallet.accounts[0].address;
      const eas = new web3.eth.Contract(EAS_ABI, EAS_CONTRACT_ADDRESS);
      const data = encodeTrialData(web3, clean, months);

      const replacement = await eas.methods
        .attest(attestationRequest(data, originalUid))
        .send({ from });
      const replacementUidFromReceipt = uidFromReceipt(replacement, EAS_CONTRACT_ADDRESS);
      setReplacementUid(replacementUidFromReceipt);

      const revoked = await eas.methods.revoke(revocationRequest(originalUid)).send({ from });
      setRevocationTxHash(revoked.transactionHash);
    } catch (e) {
      setCloseoutError(e.message || String(e));
    } finally {
      setCloseoutLoading(false);
    }
  };

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
            Paid directly to the verified Prezenti Safe. No 0xSplits collector
            is deployed for this trial.
          </li>
          <li>
            Prezenti separately commits to routing half of what it receives
            onward to the Celo Community Fund — equivalent to{' '}
            <strong>{pct(TRIAL_TERMS.communityFundBasisPoints)}</strong> of
            covered income. That is Prezenti's promise, not yours.
          </li>
          <li>
            Capped at <strong>${TRIAL_TERMS.capUsd.toLocaleString()}</strong>,
            ten times the sponsorship.
          </li>
          <li>
            Expires{' '}
            {new Date(expiresAt() * 1000).toISOString().slice(0, 10)}.
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
            current trial terms release
          </a>{' '}
          — pinned by content hash, so the words recorded on-chain cannot change
          under you.
        </p>
      </div>

      {uid && (
        <div className="info-section">
          <h3>Pledge recorded</h3>
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
              <a href={`https://celoscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
                View transaction
              </a>
            </p>
          )}
          <p>
            It is revocable. If you withdraw from the programme, the actual
            months funded are recorded later and this pledge is closed out with
            a replacement attestation that references this UID.
          </p>
        </div>
      )}

      <h3>Initial acceptance pledge</h3>
      <label>
        Your GitHub handle
        <input
          type="text"
          value={handle}
          placeholder="octocat"
          onChange={(e) => setHandle(e.target.value)}
        />
      </label>

      <p>
        The full-term pledge is <strong>{fullTermObligation}%</strong>, capped at $
        {TRIAL_TERMS.capUsd.toLocaleString()}. If you withdraw early, the actual
        months funded are recorded at withdrawal or term end and the pledge is
        closed out with a replacement attestation.
      </p>
      <p>
        This public pledge names your GitHub handle on-chain. It is mandatory
        for acceptance into this trial.
      </p>

      <label>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />{' '}
        I have read the terms and make this public commitment in good faith.
      </label>

      {error && <p className="error">{error}</p>}

      <button onClick={sign} disabled={loading} className="connect-button">
        {loading ? 'Signing…' : wallet ? 'Sign the pledge' : 'Connect wallet'}
      </button>

      <hr />

      <h3>Close out or replace a pledge</h3>
      <p>
        Use this when you withdraw, reach the end of the term, hit the cap, or
        need to correct a material mistake. The replacement attestation records
        the final months funded and references the original UID, then your
        wallet revokes the superseded original attestation.
      </p>

      <label>
        Your GitHub handle
        <input
          type="text"
          value={closeoutHandle}
          placeholder="octocat"
          onChange={(e) => setCloseoutHandle(e.target.value)}
        />
      </label>

      <label>
        Original attestation UID
        <input
          type="text"
          value={originalUid}
          placeholder="0x…"
          onChange={(e) => setOriginalUid(e.target.value.trim())}
        />
      </label>

      <label>
        Months actually funded (0-{TRIAL_TERMS.termMonths})
        <input
          type="number"
          min="0"
          max={TRIAL_TERMS.termMonths}
          step="1"
          value={monthsFunded}
          onChange={(e) => setCloseoutMonthsFunded(e.target.value)}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={closeoutAgreed}
          onChange={(e) => setCloseoutAgreed(e.target.checked)}
        />{' '}
        I confirm this is the final months-funded value and I am revoking the
        superseded pledge.
      </label>

      {closeoutError && <p className="error">{closeoutError}</p>}

      <button onClick={closeOut} disabled={closeoutLoading} className="connect-button">
        {closeoutLoading
          ? 'Closing out…'
          : wallet
          ? 'Sign replacement and revoke original'
          : 'Connect wallet'}
      </button>

      {replacementUid && (
        <div className="info-section">
          <p>
            Replacement attestation:{' '}
            <a
              href={`https://celo.easscan.org/attestation/view/${replacementUid}`}
              target="_blank"
              rel="noreferrer"
            >
              {replacementUid.slice(0, 10)}…{replacementUid.slice(-6)}
            </a>
          </p>
          {revocationTxHash ? (
            <p>
              Revocation transaction:{' '}
              <a
                href={`https://celoscan.io/tx/${revocationTxHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {revocationTxHash.slice(0, 10)}…{revocationTxHash.slice(-6)}
              </a>
            </p>
          ) : (
            <p>
              Replacement signed. If revocation failed, retry so the original
              UID is not left active.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TrialPledge;
