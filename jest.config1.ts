import type { Config } from 'jest';

// This config is used `ts-jest` to work with TypeScript tests.
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '@ts-stack/markdown': '<rootDir>/packages/markdown/src',
  },
};

export default config;
