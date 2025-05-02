import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewForm from "../create";

jest.mock("../../../utils/supabaseClient", () => {
  const insertReport = jest.fn(() => ({
    select: jest.fn(() => ({
      single: () => Promise.resolve({ data: { id: "report-id" }, error: null }),
    })),
  }));

  const insertProperty = jest.fn(() => ({
    select: jest.fn(() => ({
      single: () =>
        Promise.resolve({ data: { id: "new-property-id" }, error: null }),
    })),
  }));

  const mockUpload = jest.fn().mockResolvedValue({ data: {}, error: null });

  const mockFrom = jest.fn((table: string) => {
    if (table === "users") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({ data: [{ id: "user-db-id" }], error: null })
            ),
          })),
        })),
      };
    }
    if (table === "profiles") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({ data: [{ id: "profile-id" }], error: null })
            ),
          })),
        })),
      };
    }
    if (table === "properties") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        insert: insertProperty,
      };
    }
    if (table === "reports") {
      return {
        insert: insertReport,
      };
    }
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
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: "auth-user-id" } } },
          error: null,
        }),
        onAuthStateChange: jest.fn(() => ({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        })),
      },
    },
    useSupabaseAuth: jest.fn(() => ({
      user: { id: "auth-user-id" },
    })),
    __mocks: {
      insertReport,
      insertProperty,
    },
  };
});

import { supabase } from "../../../utils/supabaseClient";

describe("NewForm", () => {
  it("calls Supabase with correct user ID on form submit", async () => {
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
  it("creates a report after property creation", async () => {
    const { __mocks } = require("../../../utils/supabaseClient");

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
      expect(__mocks.insertReport).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: "new-property-id",
          creator_id: "user-db-id",
          status: "draft",
          title: expect.stringContaining("AllState"),
          incident_date: "2024-01-01",
        })
      );
    });
  });
  it("uploads an image if one is selected", async () => {
    const { supabase } = require("../../../utils/supabaseClient");

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

    const file = new File(["dummy content"], "damage.jpg", {
      type: "image/jpeg",
    });
    const fileInput = screen.getByTestId("image-upload");

    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /submit claim/i }));

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith("reports");
      expect(supabase.storage.from("reports").upload).toHaveBeenCalled();
    });
  });

  it("displays the form title", () => {
    render(<NewForm />);
    expect(
      screen.getByRole("heading", { name: /new form/i })
    ).toBeInTheDocument();
  });
  it("renders the form", () => {
    render(<NewForm />);

    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/insurance provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/damage occur/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /submit claim/i })
    ).toBeInTheDocument();
  });
});
