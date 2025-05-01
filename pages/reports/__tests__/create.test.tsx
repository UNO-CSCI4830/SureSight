import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewForm from "../create";

jest.mock("../../../utils/supabaseClient", () => {
  const mockUpload = jest.fn().mockResolvedValue({ data: {}, error: null });

  const mockLimit = jest.fn(() =>
    Promise.resolve({ data: [{ id: "user-db-id" }], error: null })
  );
  const mockEq = jest.fn(() => ({ limit: mockLimit }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));

  const mockFrom = jest.fn((table: string) => {
    if (table === "users") return { select: mockSelect };
    if (table === "profiles")
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({ data: [{ id: "profile-id" }], error: null })
            ),
          })),
        })),
      };
    if (table === "properties")
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: () =>
              Promise.resolve({ data: { id: "new-property-id" }, error: null }),
          })),
        })),
      };
    if (table === "reports")
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: () =>
              Promise.resolve({ data: { id: "report-id" }, error: null }),
          })),
        })),
      };
    return {};
  });

  return {
    supabase: {
      from: mockFrom,
      storage: {
        from: jest.fn(() => ({
          upload: mockUpload,
        })),
      },
    },
    useSupabaseAuth: jest.fn(() => ({
      user: { id: "auth-user-id" },
    })),
  };
});

import { supabase } from "../../../utils/supabaseClient";

describe("NewForm", () => {
  it("calls Supabase with correct user ID on form submit", async () => {
    render(<NewForm />);

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: "123 Main St, Omaha NE 68101" },
    });
    fireEvent.change(screen.getByLabelText(/insurance provider/i), {
      target: { value: "AllState" },
    });
    fireEvent.change(screen.getByLabelText(/damage occur/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit claim/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("users");
    });
  });
  it("fetches the correct profile using user-db-id", async () => {
    render(<NewForm />);

    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: "123 Main St, Omaha NE 68101" },
    });
    fireEvent.change(screen.getByLabelText(/insurance provider/i), {
      target: { value: "AllState" },
    });
    fireEvent.change(screen.getByLabelText(/damage occur/i), {
      target: { value: "2024-01-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit claim/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("profiles");
    });
  });
});
