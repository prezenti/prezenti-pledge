// Pulling the attestation uid out of a transaction receipt.
//
// In `Attested(address indexed recipient, address indexed attester,
// bytes32 uid, bytes32 indexed schemaUID)` the uid is NOT indexed, so it lives
// in `data`. An earlier version read `topics[1]`, which is the padded
// *recipient address* — producing a well-formed, entirely wrong explorer link.
//
// Kept free of React and wallet imports so it can be tested directly.

export const ATTESTED_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
    { indexed: true, internalType: 'address', name: 'attester', type: 'address' },
    { indexed: false, internalType: 'bytes32', name: 'uid', type: 'bytes32' },
    { indexed: true, internalType: 'bytes32', name: 'schemaUID', type: 'bytes32' },
  ],
  name: 'Attested',
  type: 'event',
};

export function uidFromReceipt(receipt, easAddress) {
  const decoded = receipt?.events?.Attested?.returnValues?.uid;
  if (typeof decoded === 'string' && decoded.length === 66) return decoded;

  const log = (receipt?.logs || []).find(
    (l) =>
      l.address?.toLowerCase() === String(easAddress).toLowerCase() && l.data
  );
  if (!log) return null;
  const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
  return data.length >= 64 ? `0x${data.slice(0, 64)}` : null;
}
