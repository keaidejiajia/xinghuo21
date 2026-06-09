import { formatLevelChangeDisplay } from '../src/lib/levelChangeDisplay.ts';

const cases = [
  {
    name: 'front higher number means demotion',
    input: { fromSide: 'front', fromLevel: 2, toSide: 'front', toLevel: 3 },
    expected: { label: '↓降L3', tone: 'down' },
  },
  {
    name: 'front lower number means rise',
    input: { fromSide: 'front', fromLevel: 3, toSide: 'front', toLevel: 2 },
    expected: { label: '↑升L2', tone: 'up' },
  },
  {
    name: 'back higher number means rise',
    input: { fromSide: 'back', fromLevel: 1, toSide: 'back', toLevel: 2 },
    expected: { label: '↑升L2', tone: 'up' },
  },
  {
    name: 'back lower number means demotion',
    input: { fromSide: 'back', fromLevel: 2, toSide: 'back', toLevel: 1 },
    expected: { label: '↓降L1', tone: 'down' },
  },
  {
    name: 'side change is flip',
    input: { fromSide: 'front', fromLevel: 6, toSide: 'back', toLevel: 1 },
    expected: { label: '↻翻面', tone: 'flip' },
  },
];

for (const item of cases) {
  const actual = formatLevelChangeDisplay(item.input);
  if (actual.label !== item.expected.label || actual.tone !== item.expected.tone) {
    throw new Error(`${item.name}: expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('level-change-display assertions passed');
