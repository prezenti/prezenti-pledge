import React, { useState, useEffect } from 'react';
import { useConnectWallet, useWallets } from '@web3-onboard/react';
import Web3 from 'web3';
import { usePledgeContext } from '../context/PledgeContext';

const EAS_CONTRACT_ADDRESS = '0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92';
const CELO_GOVERNANCE_ADDRESS = '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972';
const CELO_CHAIN_ID = 42220;
const SCHEMA_UID = '0xbd7d42cc769568e7f9e4a8f28d1492b214b82072f7ff3b6dacb57268ff8020b4';

function PledgeSign() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
  const connectedWallets = useWallets();
  const { pledges } = usePledgeContext();
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [attestationUid, setAttestationUid] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [pledgor, setPledgor] = useState({
    entityName: '',
    entityType: '',
    jurisdiction: '',
    address: ''
  });
  const [pledgeDetails, setPledgeDetails] = useState({
    amountCommitted: '',
    pledgeType: 'Revenue',
    startDate: '',
    paymentFrequency: ''
  });
  const executionDate = new Date().toISOString().split('T')[0];
  const pledgeId = `PLEDGE-${(pledges.length + 1).toString().padStart(4, '0')}`;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Validation functions
  const isValidAddress = (address) => {
    // Step 1: Check if input is a non-empty string
    if (typeof address !== 'string' || address.trim() === '') {
      return false;
    }
  
    const cleanedAddress = address.trim();
  
    // Step 2: Regex to allow common address characters
    // - Letters (a-z, A-Z), digits (0-9), spaces, commas, periods, hyphens, hashtags, slashes, apostrophes
    // - At least one non-whitespace character
    const addressRegex = /^[a-zA-Z0-9\s,.#'-\/]+$/;
  
    // Step 3: Additional checks
    // - Ensure at least one letter or digit to avoid purely punctuation
    const hasLetterOrDigit = /[a-zA-Z0-9]/.test(cleanedAddress);
    // - Prevent excessive punctuation (e.g., "----" or ",,,,")
    const hasExcessivePunctuation = /[,.\-#\/]{3,}/.test(cleanedAddress);
  
    return (
      addressRegex.test(cleanedAddress) &&
      hasLetterOrDigit &&
      !hasExcessivePunctuation
    );
  };

  const isValidPercentage = (value) => {
    if (!value.endsWith('%')) return false;
    const num = parseFloat(value.slice(0, -1));
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  const getPaymentFrequencyOptions = () => {
    switch (pledgeDetails.pledgeType) {
      case 'Tokens':
        return [{ value: 'At TGE', label: 'At TGE' }];
      case 'Revenue':
        return [
          { value: '', label: 'Not specified' },
          { value: 'Annually', label: 'Annually' },
          { value: 'Quarterly', label: 'Quarterly' },
          { value: 'Monthly', label: 'Monthly' }
        ];
      case 'Both':
        return [
          { value: '', label: 'Not specified' },
          { value: 'At TGE', label: 'At TGE' },
          { value: 'Annually', label: 'Annually' },
          { value: 'Quarterly', label: 'Quarterly' },
          { value: 'Monthly', label: 'Monthly' }
        ];
      default:
        return [];
    }
  };

  const signPledge = async () => {
    console.log('signPledge called');
    if (!pledgor.entityName || !pledgor.entityType || !pledgor.jurisdiction || !pledgeDetails.amountCommitted || !pledgeDetails.pledgeType) {
      setError('Please fill in all required fields');
      console.log('Validation failed:', { pledgor, pledgeDetails });
      return;
    }

    if (pledgor.address && !isValidAddress(pledgor.address)) {
      setError('Please enter a valid address or leave it blank');
      return;
    }

    if (!isValidPercentage(pledgeDetails.amountCommitted)) {
      setError('Amount Committed must be a percentage (e.g., "1%", "50%") between 0 and 100');
      return;
    }

    if (!wallet || !connectedWallets.length) {
      setError('Please connect your wallet first');
      console.log('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const web3 = new Web3(wallet.provider);
      const chainId = await web3.eth.getChainId();
      const chainIdNum = Number(chainId);
      if (chainIdNum !== CELO_CHAIN_ID) {
        throw new Error('Please switch to the Celo network (chain ID 42220)');
      }

      const pledgeData = {
        pledgeId,
        pledgor,
        pledgee: {
          name: "The Celo Community",
          address: CELO_GOVERNANCE_ADDRESS
        },
        pledgeDetails: {
          amountCommitted: pledgeDetails.amountCommitted,
          pledgeType: pledgeDetails.pledgeType,
          startDate: pledgeDetails.startDate || '',
          paymentFrequency: pledgeDetails.paymentFrequency || ''
        },
        executionDetails: { executionDate },
        governingLaw: "Celo Community Governance",
        disputeResolution: "Celo Governance Proposals and Arbitration"
      };

      const easAbi = [
        {
          "inputs": [
            {
              "components": [
                {"internalType": "bytes32", "name": "schema", "type": "bytes32"},
                {
                  "components": [
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint64", "name": "expirationTime", "type": "uint64"},
                    {"internalType": "bool", "name": "revocable", "type": "bool"},
                    {"internalType": "bytes32", "name": "refUID", "type": "bytes32"},
                    {"internalType": "bytes", "name": "data", "type": "bytes"},
                    {"internalType": "uint256", "name": "value", "type": "uint256"}
                  ],
                  "internalType": "struct AttestationRequestData",
                  "name": "data",
                  "type": "tuple"
                }
              ],
              "internalType": "struct AttestationRequest",
              "name": "request",
              "type": "tuple"
            }
          ],
          "name": "attest",
          "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
          "stateMutability": "payable",
          "type": "function"
        }
      ];

      const easContract = new web3.eth.Contract(easAbi, EAS_CONTRACT_ADDRESS);

      const schemaTypes = [
        { name: 'pledgeId', type: 'string' },
        { 
          name: 'pledgor', 
          type: 'tuple', 
          components: [
            { name: 'entityName', type: 'string' },
            { name: 'entityType', type: 'string' },
            { name: 'jurisdiction', type: 'string' },
            { name: 'entityAddress', type: 'string' }
          ]
        },
        { 
          name: 'pledgee', 
          type: 'tuple', 
          components: [
            { name: 'name', type: 'string' },
            { name: 'addr', type: 'address' }
          ]
        },
        { 
          name: 'pledgeDetails', 
          type: 'tuple', 
          components: [
            { name: 'amountCommitted', type: 'string' },
            { name: 'pledgeType', type: 'string' },
            { name: 'startDate', type: 'string' },
            { name: 'paymentFrequency', type: 'string' }
          ]
        },
        { 
          name: 'executionDetails', 
          type: 'tuple', 
          components: [
            { name: 'executionDate', type: 'string' }
          ]
        },
        { name: 'governingLaw', type: 'string' },
        { name: 'disputeResolution', type: 'string' }
      ];

      const schemaValues = [
        pledgeId,
        [pledgor.entityName, pledgor.entityType, pledgor.jurisdiction, pledgor.address || ''],
        ["The Celo Community", CELO_GOVERNANCE_ADDRESS],
        [pledgeDetails.amountCommitted, pledgeDetails.pledgeType, pledgeDetails.startDate || '', pledgeDetails.paymentFrequency || ''],
        [executionDate],
        "Celo Community Governance",
        "Celo Governance Proposals and Arbitration"
      ];

      const encodedData = web3.eth.abi.encodeParameters(schemaTypes, schemaValues);
      const attestationRequest = {
        schema: SCHEMA_UID,
        data: {
          recipient: CELO_GOVERNANCE_ADDRESS,
          expirationTime: 0,
          revocable: false,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
          data: encodedData,
          value: 0
        }
      };

      const txData = easContract.methods.attest(attestationRequest).encodeABI();
      const gasEstimate = await web3.eth.estimateGas({
        from: connectedWallets[0].accounts[0].address,
        to: EAS_CONTRACT_ADDRESS,
        data: txData,
        value: '0x0'
      });

      const tx = {
        from: connectedWallets[0].accounts[0].address,
        to: EAS_CONTRACT_ADDRESS,
        data: txData,
        gas: Number(gasEstimate) + 100000,
        value: '0x0'
      };

      const txPromise = web3.eth.sendTransaction(tx);
      txPromise.on('transactionHash', (hash) => {
        setTxHash(hash);
      });
      const txReceipt = await txPromise;
      const uid = txReceipt.logs[0]?.topics[1] || 'Check EAS logs for UID';
      setSigned(true);
      setAttestationUid(uid);
    } catch (error) {
      console.error('Error in signPledge:', error);
      setError(error.message || 'Failed to send pledge');
    } finally {
      setLoading(false);
    }
  };

  const truncateHash = (hash) => {
    if (!hash || typeof hash !== 'string') return hash;
    if (!isMobile) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const formatAddress = (address) => {
    const truncated = isMobile ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
    return `<a href="https://celoscan.io/address/${address}" target="_blank" rel="noopener noreferrer" class="governance-address">${truncated}</a>`;
  };

  const getPledgeText = () => {
    const formattedAddress = formatAddress(CELO_GOVERNANCE_ADDRESS);
    const pledgeTypeText = pledgeDetails.pledgeType === 'Both' 
      ? 'the percentage of both revenue(revenue minus expenses) and tokens' 
      : pledgeDetails.pledgeType.toLowerCase();
    return `Pledge ID: ${pledgeId}\n` +
           `Pledgor: ${pledgor.entityName} (${pledgor.entityType}, ${pledgor.jurisdiction})\n` +
           `Pledgee: The Celo Community (${formattedAddress})\n` +
           `Pledge Details: ${pledgeDetails.amountCommitted} of ${pledgeTypeText}` +
           `${pledgeDetails.startDate ? ` starting ${pledgeDetails.startDate}` : ''}` +
           `${pledgeDetails.paymentFrequency ? `, paid ${pledgeDetails.paymentFrequency}` : ''}\n` +
           `Executed: ${executionDate}\n` +
           `Governed by Celo Community Governance with dispute resolution via Celo Governance Proposals and Arbitration`;
  };

  return (
    <div className="pledge-container">
      <h2 className="pledge-container-title">Take the Pledge</h2>
      

      {!wallet ? (
        <div className="connect-prompt">Please connect your wallet to sign the pledge.</div>
      ) : signed ? (
        <div className="success">
          <p>Thank you for signing the pledge!</p>
          <p>
            Transaction hash:{' '}
            <a
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {truncateHash(txHash)}
            </a>
          </p>
          <p>
            Attestation UID:{' '}
            <a
              href={`https://celo.easscan.org/attestation/view/${attestationUid}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {truncateHash(attestationUid)}
            </a>
          </p>
        </div>
      ) : (
        <form className="pledge-form" onSubmit={(e) => { e.preventDefault(); signPledge(); }}>
          <div className="form-section">
            <h3>Pledgor Details</h3>
            <div className="form-group">
              <label>Entity Name</label>
              <input
                className="name-input"
                type="text"
                value={pledgor.entityName}
                onChange={(e) => setPledgor({...pledgor, entityName: e.target.value})}
                placeholder="Enter entity name"
                required
              />
            </div>
            <div className="form-group">
              <label>Entity Type</label>
              <input
                className="name-input"
                type="text"
                value={pledgor.entityType}
                onChange={(e) => setPledgor({...pledgor, entityType: e.target.value})}
                placeholder="e.g., LLC, Corporation"
                required
              />
            </div>
            <div className="form-group">
              <label>Jurisdiction</label>
              <input
                className="name-input"
                type AscendantLink
                type="text"
                value={pledgor.jurisdiction}
                onChange={(e) => setPledgor({...pledgor, jurisdiction: e.target.value})}
                placeholder="e.g., Delaware, USA"
                required
              />
            </div>
            <div className="form-group">
              <label>Address (optional)</label>
              <input
                className="name-input"
                type="text"
                value={pledgor.address}
                onChange={(e) => setPledgor({...pledgor, address: e.target.value})}
                placeholder="e.g., 123 Main St"
              />
            </div>
          </div>

          <div className="form-section pledge-details-section">
            <h3>Pledge Details</h3>
            <div className="form-group">
              <label>Amount Committed</label>
              <input
                className="name-input"
                type="text"
                value={pledgeDetails.amountCommitted}
                onChange={(e) => setPledgeDetails({...pledgeDetails, amountCommitted: e.target.value})}
                placeholder="e.g., 1%"
                required
              />
            </div>
            <div className="form-group">
              <label>Pledge Type</label>
              <select
                className="name-input"
                value={pledgeDetails.pledgeType}
                onChange={(e) => setPledgeDetails({...pledgeDetails, pledgeType: e.target.value, paymentFrequency: ''})}
                required
              >
                <option value="Revenue">Revenue(revenue minus expenses)</option>
                <option value="Tokens">Tokens</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date (optional)</label>
              <input
                className="name-input"
                type="date"
                value={pledgeDetails.startDate}
                onChange={(e) => setPledgeDetails({...pledgeDetails, startDate: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Payment Frequency (optional)</label>
              <select
                className="name-input"
                value={pledgeDetails.paymentFrequency}
                onChange={(e) => setPledgeDetails({...pledgeDetails, paymentFrequency: e.target.value})}
              >
                {getPaymentFrequencyOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <p className="disclaimer">Note: Start Date and Payment Frequency are optional and may be specified later if not known at this time.</p>
          </div>

          <div className="form-section">
            <h3>Execution Details</h3>
            <div className="form-group">
              <label>Execution Date</label>
              <input className="name-input" type="date" value={executionDate} disabled />
            </div>
          </div>

          {wallet && (
            <div className="pledge-confirmation">
              <pre className="pledge-text" dangerouslySetInnerHTML={{ __html: getPledgeText() }} />
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing...' : 'Sign Pledge'}
          </button>
          {error && <div className="error-message">{error}</div>}
        </form>
      )}
    </div>
  );
}

export default PledgeSign;