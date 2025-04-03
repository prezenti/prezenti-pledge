// src/App.js
import React from 'react';
import { Web3OnboardProvider, init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import PledgeSign from './components/PledgeSign';
import PreviousPledges from './components/PreviousPledges';
import { PledgeProvider } from './context/PledgeContext';
import './styles/App.css';

const injected = injectedModule();
const web3Onboard = init({
  wallets: [injected],
  chains: [
    {
      id: '0xa4ec',
      token: 'CELO',
      label: 'Celo Mainnet',
      rpcUrl: 'https://forno.celo.org'
    }
  ],
  appMetadata: {
    name: 'Prezenti Pledge',
    description: 'Support Celo\'s sustainable ecosystem'
  },
  connect: {
    autoConnectLastWallet: true,
    showSidebar: true
  },
  accountCenter: {
    desktop: { enabled: true, position: 'topRight', minimal: false },
    mobile: { enabled: true, position: 'topRight', minimal: true }
  }
});

function ConnectButton() {
  const [{ connecting }] = useConnectWallet();
  if (web3Onboard.state.get().wallets.length > 0) return null;
  return (
    <button
      onClick={() => web3Onboard.connectWallet()}
      disabled={connecting}
      className="connect-button"
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

function App() {
  const [pledgeData, setPledgeData] = React.useState({
    pledgeId: '',
    pledgor: { entityName: '', entityType: '', jurisdiction: '', address: '' },
    pledgeDetails: { amountCommitted: '', pledgeType: 'Revenue', startDate: '', paymentFrequency: 'Annually' },
    executionDetails: { executionDate: '', timestampOfCommitment: '' }
  });
  const [isWalletConnected, setIsWalletConnected] = React.useState(false);

  const getPledgeText = () => {
    const { pledgeId, pledgor, pledgeDetails, executionDetails } = pledgeData;
    return `Pledge ID: ${pledgeId}\n` +
           `Pledgor: ${pledgor.entityName} (${pledgor.entityType}, ${pledgor.jurisdiction})\n` +
           `Pledgee: The Celo Community (${CELO_GOVERNANCE_ADDRESS})\n` +
           `Pledge Details: ${pledgeDetails.amountCommitted} of ${pledgeDetails.pledgeType} starting ${pledgeDetails.startDate}, paid ${pledgeDetails.paymentFrequency}\n` +
           `Executed: ${executionDetails.executionDate}, Timestamp: ${executionDetails.timestampOfCommitment}\n` +
           `Governed by Celo Community Governance with dispute resolution via Celo Governance Proposals and Arbitration`;
  };

  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <PledgeProvider>
        <div className="App">
        <header className="header">
            <div className="header-content">
            <div className="header-right">
            <img src="/Prezenti_horizontal logo_ dark forest.svg" alt="Prezenti Logo" className="logo" />
                <ConnectButton />
              </div>
              <div className="header-left">
                <div className="header-title-row">

                <img src="/logo-no-background.svg" alt="Pledge Logo" className="pledge-logo" />
                </div>

              </div>
            </div>
          </header>
          <main>
            <div className="pledge-container" style={{ textAlign: 'center' }}>
              <h2>The Prezenti Pledge: A Commitment to Celo</h2>
              <div className="info-section">
                <p>The Celo Community Fund has fueled innovation, backing projects that push the ecosystem forward. But it won't last forever. The Prezenti Pledge is a way for grantees to give back—ensuring the fund continues to support builders like you.</p>
                <p>By committing 1% of future revenue or tokens from your Token Generation Event (TGE), you're not just saying thanks—you're investing in the future of Celo. This is a commitment between you and the community that helped you get here. It's transparent, on-chain, and built to sustain the ecosystem for the long run.</p>
                <p>The time to act is now. Let's keep Celo growing—together.</p>
              </div>
            </div>
            <PledgeSign />
            {isWalletConnected && (
              <div className="pledge-confirmation">
                <pre>{getPledgeText()}</pre>
              </div>
            )}
            <PreviousPledges />
          </main>
          <footer>
            <p>© 2025 Prezenti - Building a sustainable Celo ecosystem</p>
          </footer>
        </div>
      </PledgeProvider>
    </Web3OnboardProvider>
  );
}

export default App;