// src/context/PledgeContext.js
import React, { createContext, useState, useContext } from 'react';

export const PledgeContext = createContext();

export const PledgeProvider = ({ children }) => {
  const [pledges, setPledges] = useState([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const addPledge = (pledge) => {
    setPledges((prevPledges) => {
      // Check if the pledge already exists by attestationUid
      if (prevPledges.some((p) => p.attestationUid === pledge.attestationUid)) {
        return prevPledges; // Skip if duplicate
      }
      return [...prevPledges, pledge]; // Add if not a duplicate
    });
  };

  return (
    <PledgeContext.Provider value={{ pledges, addPledge, isWalletConnected, setIsWalletConnected }}>
      {children}
    </PledgeContext.Provider>
  );
};

export const usePledgeContext = () => {
  const context = useContext(PledgeContext);
  if (context === undefined) {
    throw new Error('usePledgeContext must be used within a PledgeProvider');
  }
  return context;
};