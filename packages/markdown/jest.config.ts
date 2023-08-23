import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/src/', '<rootDir>/test/.+ts'],
};

export default config;
