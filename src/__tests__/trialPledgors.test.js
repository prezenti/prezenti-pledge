import {
  buildTrialLogsUrl,
  parseTrialLogsResponse,
} from '../components/TrialPledgors';

const EAS = '0x4200000000000000000000000000000000000021';
const SCHEMA =
  '0x6a5f8c4f58911419d3ae8a67df4f342eea92c0d2167b5b814eaa6d450e9135f4';
const EVENT =
  '0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35';

function trialLog(uid, overrides = {}) {
  return {
    address: EAS,
    data: uid,
    topics: [EVENT, '0xrecipient', '0xattester', SCHEMA],
    transactionHash: '0x' + 'ef'.repeat(32),
    ...overrides,
  };
}

test('queries the complete trial schema history from Celo Blockscout', () => {
  const url = new URL(buildTrialLogsUrl());

  expect(url.origin + url.pathname).toBe('https://celo.blockscout.com/api');
  expect(url.searchParams.get('module')).toBe('logs');
  expect(url.searchParams.get('action')).toBe('getLogs');
  expect(url.searchParams.get('fromBlock')).toBe('74752227');
  expect(url.searchParams.get('toBlock')).toBe('latest');
  expect(url.searchParams.get('address')).toBe(EAS);
  expect(url.searchParams.get('topic0')).toBe(EVENT);
  expect(url.searchParams.get('topic3')).toBe(SCHEMA);
  expect(url.searchParams.get('topic0_3_opr')).toBe('and');
});

test('keeps every valid indexed pledge log', () => {
  const uids = [
    '0x' + '11'.repeat(32),
    '0x' + '22'.repeat(32),
    '0x' + '33'.repeat(32),
    '0x' + '44'.repeat(32),
  ];
  const result = parseTrialLogsResponse({
    status: '1',
    result: uids.map((uid) => trialLog(uid)),
  });

  expect(result.map((log) => log.data)).toEqual(uids);
});

test('rejects unrelated or malformed indexed logs', () => {
  const uid = '0x' + '11'.repeat(32);
  const result = parseTrialLogsResponse({
    status: '1',
    result: [
      trialLog(uid),
      trialLog(uid, { address: '0x' + '99'.repeat(20) }),
      trialLog(uid, {
        topics: [EVENT, '0xrecipient', '0xattester', '0x' + '88'.repeat(32)],
      }),
      trialLog('0xdeadbeef'),
    ],
  });

  expect(result).toHaveLength(1);
  expect(result[0].data).toBe(uid);
});

test('handles an empty index and rejects an invalid response', () => {
  expect(parseTrialLogsResponse({ status: '0', result: [] })).toEqual([]);
  expect(() => parseTrialLogsResponse({ message: 'upstream unavailable' })).toThrow(
    'upstream unavailable'
  );
});
