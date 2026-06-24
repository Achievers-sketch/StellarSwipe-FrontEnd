import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  // Accessibility tests that render components need jsdom — use
  // @jest-environment jsdom at the top of those files to opt in per-file.
  // MSW lifecycle (listen/reset/close) is wired up for all tests below.
  setupFilesAfterEnv: ["<rootDir>/src/mocks/jest.setup.ts"],
};

export default config;
