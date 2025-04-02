import React, { useEffect, useState } from 'react';
import { request, gql } from 'graphql-request';
import { usePledgeContext } from '../context/PledgeContext';
import { ethers } from 'ethers';

const EAS_SUBGRAPH_URL = 'https://celo.easscan.org/graphql';
const SCHEMA_ID = '0x0b0f63bd8efc37e0ac267ee03c0857dbf21468ec5a36d51495fd51bdeb6e08a0';

const PreviousPledges = () => {
  const { addPledge, pledges } = usePledgeContext();
  const [fetchedPledges, setFetchedPledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const decodeAttestationData = (data) => {
    try {
      const coder = ethers.AbiCoder.defaultAbiCoder();
      const decoded = coder.decode(
        [
          'string',
          'tuple(string, string, string, string)',
          'tuple(string, address)',
          'tuple(string, string, string, string)',
          'tuple(string)',
          'string',
          'string'
        ],
        data
      );
      return {
        pledgeId: decoded[0],
        pledgor: {
          entityName: decoded[1][0],
          entityType: decoded[1][1],
          jurisdiction: decoded[1][2],
          address: decoded[1][3]
        },
        pledgee: {
          name: decoded[2][0],
          address: decoded[2][1]
        },
        pledgeDetails: {
          amountCommitted: decoded[3][0],
          pledgeType: decoded[3][1],
          startDate: decoded[3][2],
          paymentFrequency: decoded[3][3]
        },
        executionDetails: {
          executionDate: decoded[4][0]
        },
        governingLaw: decoded[5],
        disputeResolution: decoded[6]
      };
    } catch (e) {
      console.error('Decode error:', e.message, 'Data:', data);
      return null;
    }
  };

  const fetchPledges = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = gql`
        query Attestations($where: AttestationWhereInput) {
          attestations(take: 25, orderBy: {time: desc}, where: $where) {
            id
            attester
            recipient
            data
            time
          }
        }
      `;

      const variables = {
        where: {
          schemaId: {
            equals: SCHEMA_ID
          }
        }
      };

      const response = await request(EAS_SUBGRAPH_URL, query, variables);
      console.log('GraphQL response:', response);

      const formattedPledges = response.attestations.map(attestation => {
        const decodedData = decodeAttestationData(attestation.data);
        if (!decodedData) {
          console.warn(`Failed to decode attestation: ${attestation.id}`);
          return null;
        }
        return {
          pledgeData: decodedData,
          attestationUid: attestation.id,
          attester: attestation.attester,
          recipient: attestation.recipient,
          timestamp: Number(attestation.time)
        };
      }).filter(pledge => pledge !== null);

      console.log('Formatted pledges:', formattedPledges);
      // Update local state
      setFetchedPledges((prev) => {
        const newPledges = formattedPledges.filter(
          (newPledge) => !prev.some((p) => p.attestationUid === newPledge.attestationUid)
        );
        return [...prev, ...newPledges];
      });
      // Update context
      formattedPledges.forEach(pledge => addPledge(pledge));
    } catch (err) {
      console.error('Error fetching attestations:', err);
      setError(err.message || 'Failed to fetch attestations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPledges();
  }, []); // Runs once on mount

  const formatAttestationUid = (uid) => {
    if (!uid || uid.length < 10) return uid;
    return `${uid.slice(0, 4)}...${uid.slice(-4)}`;
  };

  return (
    <div className="previous-pledges-container">
      <h2>Previous Pledges</h2>
      {loading && <p>Loading previous pledges...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && fetchedPledges.length === 0 ? (
        <p>No previous pledges found.</p>
      ) : (
        <ul className="previous-pledges-list">
          {fetchedPledges.map((pledge, index) => (
            <li key={index} className="previous-pledge-item">
              <p><strong>Pledge ID:</strong> {pledge.pledgeData?.pledgeId || 'N/A'}</p>
              <p><strong>Pledgor:</strong> {pledge.pledgeData?.pledgor.entityName} ({pledge.pledgeData?.pledgor.entityType}, {pledge.pledgeData?.pledgor.jurisdiction})</p>
              <p><strong>Pledge:</strong> {pledge.pledgeData?.pledgeDetails.amountCommitted} of {pledge.pledgeData?.pledgeDetails.pledgeType}
                {pledge.pledgeData?.pledgeDetails.startDate ? ` starting ${pledge.pledgeData?.pledgeDetails.startDate}` : ''}
                {pledge.pledgeData?.pledgeDetails.paymentFrequency ? `, paid ${pledge.pledgeData?.pledgeDetails.paymentFrequency}` : ''}
              </p>
              <p><strong>Executed:</strong> {pledge.pledgeData?.executionDetails.executionDate}</p>
              <p>
                <strong>Attestation UID:</strong>{' '}
                <a
                  href={`https://celo.easscan.org/attestation/view/${pledge.attestationUid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  {formatAttestationUid(pledge.attestationUid)}
                </a>
              </p>
              <p>
                <strong>Attester:</strong>{' '}
                <a
                  href={`https://celo.easscan.org/address/${pledge.attester}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  {pledge.attester}
                </a>
              </p>
              <p><strong>Timestamp:</strong> {new Date(pledge.timestamp * 1000).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PreviousPledges;