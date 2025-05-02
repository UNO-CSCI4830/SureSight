import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../../pages/dashboard';

jest.mock('next/router', () => ({
    useRouter: () => ({
        push: jest.fn()
    })
}));

jest.mock('../../utils/supabaseClient', () => ({
    __esModule: true,
    useSupabaseAuth: () => ({ user: { id: 'test-user-id' } }),
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        }))
    }
}));

beforeEach(() => {
    jest.restoreAllMocks();
});

describe('Dashboard Weather', () => {

    // Test 1 Dashboard is in the header
    test('renders dashboard heading', () => {
        render(<Dashboard />);
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    // Test 2 Weather information and location is displayed in header
    test('displays weather location and temperature', async () => {

        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                json: async () => ({ city: 'Omaha' })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    main: { temp: 56 },
                    weather: [{ description: 'Rainy' }],
                    name: 'Omaha'
                })
            });

        render(<Dashboard />);

        expect(await screen.findByText(/Weather in Omaha/i)).toBeInTheDocument();
        expect(await screen.findByText(/56°F/i)).toBeInTheDocument();
        expect(await screen.findByText(/Rainy/i)).toBeInTheDocument();
    });

    // Test 3 Handle an API call failure
    test('handles weather API failure', async () => {

        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                json: async () => ({ city: 'Omaha' })
            })
            .mockResolvedValueOnce({
                ok: false
            });

        render(<Dashboard />);

        expect(await screen.findByText(/Fetching weather/i)).toBeInTheDocument();
    });

});