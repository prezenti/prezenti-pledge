import { uidFromReceipt } from '../lib/attestation';

const EAS = '0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92';
const UID = '0x' + 'ab'.repeat(32);
const RECIPIENT_TOPIC = '0x000000000000000000000000' + 'cd'.repeat(20);

test('reads the decoded uid when web3 provides it', () => {
  const receipt = { events: { Attested: { returnValues: { uid: UID } } } };
  expect(uidFromReceipt(receipt, EAS)).toBe(UID);
});

test('falls back to the first non-indexed word, not topics[1]', () => {
  // Attested(address indexed recipient, address indexed attester,
  //          bytes32 uid, bytes32 indexed schemaUID)
  // topics[1] is the padded recipient address. Reading it produced a
  // valid-looking but wrong explorer link.
  const receipt = {
    logs: [
      {
        address: EAS,
        topics: ['0xsig', RECIPIENT_TOPIC, '0xattester', '0xschema'],
        data: UID,
      },
    ],
  };
  const got = uidFromReceipt(receipt, EAS);
  expect(got).toBe(UID);
  expect(got).not.toBe(RECIPIENT_TOPIC);
});

test('ignores logs from other contracts', () => {
  const receipt = {
    logs: [{ address: '0x' + '11'.repeat(20), topics: [], data: UID }],
  };
  expect(uidFromReceipt(receipt, EAS)).toBeNull();
});

test('returns null rather than a truncated uid', () => {
  const receipt = { logs: [{ address: EAS, topics: [], data: '0xdeadbeef' }] };
  expect(uidFromReceipt(receipt, EAS)).toBeNull();
});
