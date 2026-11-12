import "dotenv/config";

export const env = {
  mockWriteFailure:
    process.env.MOCK_WRITE_FAILURE === "true",
};