import { jest } from '@jest/globals';

// Define the mock BEFORE any other imports that might use it
jest.unstable_mockModule('../../src/modules/students/counter.model.js', () => ({
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

// Use dynamic imports to ensure mocks are used
const { getNextSequenceValue, generateCode } =
  await import('../../src/shared/utils/atomicCounter.js');
const Counter = (await import('../../src/modules/students/counter.model.js'))
  .default;

describe('Atomic Counter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getNextSequenceValue should increment sequence', async () => {
    Counter.findByIdAndUpdate.mockResolvedValue({ seq: 5 });

    const seq = await getNextSequenceValue('test');

    expect(seq).toBe(5);
  });

  test('generateCode should format code with prefix and padding', async () => {
    Counter.findByIdAndUpdate.mockResolvedValue({ seq: 42 });

    const code = await generateCode('student', 'STD', null, 5);

    expect(code).toBe('STD-00042');
  });
});
