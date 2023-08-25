import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js'],
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '@ts-stack/markdown': '<rootDir>/packages/markdown/dist/src',
  },
  projects: ['<rootDir>/packages/*/jest.config.ts'],
};

export default config;