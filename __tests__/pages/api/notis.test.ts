import handler from '../../pages/api/notis';
import { createMocks } from 'node-mocks-http';

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder,
    })),
  }
}));

describe('/api/notis API route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if user_id is missing', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'User ID is required' });
  });

  it('returns messages if user_id is provided and query succeeds', async () => {
    const mockData = [
      { id: '1', content: 'hello', receiver_id: 'user-1', created_at: '2025-04-30T12:00:00Z' }
    ];

    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const { req, res } = createMocks({
      method: 'GET',
      query: { user_id: 'user-1' },
    });

    await handler(req, res);

    expect(mockEq).toHaveBeenCalledWith('receiver_id', 'user-1');
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(mockData);
  });

  it('returns 500 if Supabase throws an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('Something went wrong') });

    const { req, res } = createMocks({
      method: 'GET',
      query: { user_id: 'user-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Something went wrong' });
  });
});
