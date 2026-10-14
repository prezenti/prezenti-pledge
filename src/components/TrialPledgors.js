import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { EAS_CONTRACT_ADDRESS, TRIAL_SCHEMA_UID } from '../config/trialSchema';
import {
  displayRecipientHandle,
  formatUnixDate,
  normalizeTrialAttestation,
  shortenHex,
} from '../lib/trialPledgeData';

const CELO_RPC_URL = 'https://forno.celo.org';
const BLOCKSCOUT_LOGS_URL = 'https://celo.blockscout.com/api';
const ATTESTED_TOPIC = ethers.id('Attested(address,address,bytes32,bytes32)');
const TRIAL_SCHEMA_START_BLOCK = 74752227;
const UID_RE = /^0x[0-9a-f]{64}$/i;

const EAS_READ_ABI = [
  'function getAttestation(bytes32 uid) view returns (tuple(bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data) attestation)',
];

const easReadInterface = new ethers.Interface(EAS_READ_ABI);

async function rpc(method, params = []) {
  const response = await fetch(CELO_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || 'Celo RPC error');
  return json.result;
}

export function buildTrialLogsUrl() {
  const url = new URL(BLOCKSCOUT_LOGS_URL);
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('fromBlock', String(TRIAL_SCHEMA_START_BLOCK));
  url.searchParams.set('toBlock', 'latest');
  url.searchParams.set('address', EAS_CONTRACT_ADDRESS);
  url.searchParams.set('topic0', ATTESTED_TOPIC);
  url.searchParams.set('topic3', TRIAL_SCHEMA_UID);
  url.searchParams.set('topic0_3_opr', 'and');
  return url.toString();
}

export function parseTrialLogsResponse(payload) {
  if (
    payload?.status === '0' &&
    Array.isArray(payload.result) &&
    payload.result.length === 0
  ) {
    return [];
  }
  if (!Array.isArray(payload?.result)) {
    throw new Error(payload?.message || 'Invalid Celo Blockscout response');
  }

  return payload.result.filter(
    (log) =>
      log.address?.toLowerCase() === EAS_CONTRACT_ADDRESS.toLowerCase() &&
      log.topics?.[0]?.toLowerCase() === ATTESTED_TOPIC.toLowerCase() &&
      log.topics?.[3]?.toLowerCase() === TRIAL_SCHEMA_UID.toLowerCase() &&
      UID_RE.test(log.data || '')
  );
}

async function fetchTrialLogs() {
  const response = await fetch(buildTrialLogsUrl(), {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Celo Blockscout returned HTTP ${response.status}`);
  }
  return parseTrialLogsResponse(await response.json());
}

async function fetchAttestation(log) {
  const data = easReadInterface.encodeFunctionData('getAttestation', [log.data]);
  const result = await rpc('eth_call', [
    { to: EAS_CONTRACT_ADDRESS, data },
    'latest',
  ]);
  const attestation = easReadInterface.decodeFunctionResult(
    'getAttestation',
    result
  )[0];
  if (
    attestation.uid.toLowerCase() !== log.data.toLowerCase() ||
    attestation.schema.toLowerCase() !== TRIAL_SCHEMA_UID.toLowerCase()
  ) {
    return null;
  }
  return {
    id: attestation.uid,
    attester: attestation.attester,
    recipient: attestation.recipient,
    data: attestation.data,
    time: attestation.time,
    expirationTime: attestation.expirationTime,
    revocationTime: attestation.revocationTime,
    revoked: Number(attestation.revocationTime) > 0,
    transactionHash: log.transactionHash,
  };
}

async function fetchTrialPledgors() {
  const logs = await fetchTrialLogs();
  const rows = await Promise.all(logs.map((log) => fetchAttestation(log)));
  const records = rows
    .filter(Boolean)
    .map((attestation) => normalizeTrialAttestation(attestation))
    .filter(Boolean);

  return Array.from(
    new Map(records.map((record) => [record.uid, record])).values()
  ).sort((a, b) => b.signedAt - a.signedAt);
}

function TrialPledgors({ refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPledgors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await fetchTrialPledgors());
    } catch (e) {
      setError(e.message || 'Unable to load pledgors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPledgors();
  }, [fetchPledgors, refreshKey]);

  const activeCount = records.filter((record) => record.status === 'Active').length;

  return (
    <section
      className="trial-pledgers"
      aria-labelledby="trial-pledgers-title"
      aria-busy={loading}
    >
      <div className="trial-pledgers-heading">
        <div>
          <h3 id="trial-pledgers-title">Recorded pledgors</h3>
          <p>
            {loading
              ? 'Checking EAS...'
              : `${activeCount} active / ${records.length} total`}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPledgors}
          disabled={loading}
          className="secondary-button"
        >
          Refresh
        </button>
      </div>

      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="trial-pledgers-empty">No trial pledges recorded yet.</p>
      )}

      {records.length > 0 && (
        <ol className="trial-pledgers-list">
          {records.map((record) => (
            <li key={record.uid} className="trial-pledger-row">
              <div>
                <strong>
                  {displayRecipientHandle(record.pledge.recipientHandle)}
                </strong>
                <span>{formatUnixDate(record.signedAt)}</span>
              </div>
              <div>
                <a
                  href={`https://celo.easscan.org/address/${record.attester}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortenHex(record.attester)}
                </a>
                <a
                  href={`https://celo.easscan.org/attestation/view/${record.uid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortenHex(record.uid, 8, 6)}
                </a>
                {record.transactionHash && (
                  <a
                    href={`https://celoscan.io/tx/${record.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    tx {shortenHex(record.transactionHash, 8, 6)}
                  </a>
                )}
              </div>
              <span className={`trial-pledger-status ${record.status.toLowerCase()}`}>
                {record.status}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default TrialPledgors;
