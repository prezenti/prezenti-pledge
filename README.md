# Prezenti Pledge

Welcome to **Prezenti Pledge**, a web application designed to empower individuals and organizations to support Celo’s sustainable ecosystem by signing the Prezenti Pledge. Built on the Celo blockchain, this app allows you to connect your Celo wallet, sign a pledge, and view previous pledges—all with a modern, clean interface aligned with Prezenti’s branding.

## What is the Prezenti Pledge?

The Prezenti Pledge is a commitment to contribute to Celo’s mission of creating a sustainable and inclusive financial ecosystem. By signing the pledge, you agree to support Celo’s initiatives through resources, time, or advocacy, as outlined in your pledge details. Each pledge is recorded as an attestation on the Celo blockchain, ensuring transparency and immutability.

## Features

- **Wallet Integration**: Connect your Celo wallet seamlessly.
- **Pledge Signing**: Sign the Prezenti Pledge with customizable details (e.g., amount, frequency, start date).
- **Pledge History**: View a list of previous pledges with links to the Celo explorer.

## For Pledgers: How to Sign the Pledge

Ready to make a commitment to Celo’s ecosystem? Follow these steps:

1. **Visit the App**  
   Go to [pledge.prezenti.xyz](https://pledge.prezenti.xyz) (or the deployed URL).

2. **Connect Your Celo Wallet**  
   - Click "Connect Wallet" on the homepage.
   - Select your preferred Celo-compatible wallet (e.g., MetaMask, Valora).
   - Approve the connection in your wallet.

3. **Sign the Pledge**  
   - Fill out the pledge form with your details:
     - **Pledgor Information**: Your entity name, type, jurisdiction, and address.
     - **Pledge Details**: Amount committed, pledge type (e.g., donation, service), start date, and payment frequency.
     - **Execution Details**: When the pledge will be executed.
     - **Governance**: Governing law and dispute resolution method.
   - Review your input and click "Sign Pledge."
   - Confirm the transaction in your wallet to record it on the Celo blockchain.

4. **View Your Pledge**  
   - After signing, your pledge will appear in the "Previous Pledges" section.
   - Click the "Attestation UID" to view it on [celo.easscan.org](https://celo.easscan.org) or the "Attester" address for more details.

5. **Need Help?**  
   If you encounter issues, check the [Troubleshooting](#troubleshooting) section or contact us via [GitHub Issues](https://github.com/prezenti/prezenti-pledge/issues).


---

## For Developers: Getting Started

### Prerequisites
- **Node.js**: Version 14.x or higher.
- **npm**: Version 6.x or higher.
- A Celo wallet for testing (e.g., MetaMask with Celo network configured).

### Setup
1. **Clone the Repository**  
   ```bash
   git clone https://github.com/prezenti/prezenti-pledge.git
   cd prezenti-pledge
   ```

---

## Smart Contract Schema

Each Prezenti Pledge is encoded and submitted using the following structured schema. This ensures consistency and transparency in how pledge data is recorded on-chain.

```solidity
(string pledgeId,
 (string entityName, string entityType, string jurisdiction, string entityAddress) pledgor,
 (string name, address addr) pledgee,
 (string amountCommitted, string pledgeType, string startDate, string paymentFrequency) pledgeDetails,
 (string executionDate) executionDetails,
 string governingLaw,
 string disputeResolution)
```

The corresponding JSON schema used by the application to encode this data before submission:

```json
{
  "name": "Celo Community Pledge",
  "schema": [
    {"name": "pledgeId", "type": "string"},
    {
      "name": "pledgor",
      "type": "tuple",
      "components": [
        {"name": "entityName", "type": "string"},
        {"name": "entityType", "type": "string"},
        {"name": "jurisdiction", "type": "string"},
        {"name": "address", "type": "string"}
      ]
    },
    {
      "name": "pledgee",
      "type": "tuple",
      "components": [
        {"name": "name", "type": "string"},
        {"name": "address", "type": "string"}
      ]
    },
    {
      "name": "pledgeDetails",
      "type": "tuple",
      "components": [
        {"name": "amountCommitted", "type": "string"},
        {"name": "pledgeType", "type": "string"},
        {"name": "startDate", "type": "string"},
        {"name": "paymentFrequency", "type": "string"}
      ]
    },
    {
      "name": "executionDetails",
      "type": "tuple",
      "components": [
        {"name": "executionDate", "type": "string"}
      ]
    },
    {"name": "governingLaw", "type": "string"},
    {"name": "disputeResolution", "type": "string"}
  ]
}
```

This schema is critical for submitting structured attestations on Celo and can be reused by other tools or dApps aiming to interact with Prezenti pledges.
