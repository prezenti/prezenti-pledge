import React, { useCallback, useEffect, useState } from 'react';
import { request, gql } from 'graphql-request';
import { TRIAL_SCHEMA_UID } from '../config/trialSchema';
import {
  formatUnixDate,
  normalizeTrialAttestation,
  shortenHex,
} from '../lib/trialPledgeData';

const EAS_SUBGRAPH_URL = 'https://celo.easscan.org/graphql';

const TRIAL_PLEDGORS_QUERY = gql`
  query TrialPledgors($where: AttestationWhereInput) {
    attestations(take: 25, orderBy: { time: desc }, where: $where) {
      id
      attester
      recipient
      data
      time
      expirationTime
      revocationTime
      revoked
    }
  }
`;

function TrialPledgors({ refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPledgors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request(EAS_SUBGRAPH_URL, TRIAL_PLEDGORS_QUERY, {
        where: { schemaId: { equals: TRIAL_SCHEMA_UID } },
      });
      setRecords(
        response.attestations
          .map((attestation) => normalizeTrialAttestation(attestation))
          .filter(Boolean)
      );
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
                <strong>{record.pledge.recipientHandle}</strong>
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
