import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/src/', '<rootDir>/test/.+ts'],
  moduleNameMapper: {
    '@ts-stack/markdown': '<rootDir>/../markdown/dist/src'
  }
};

export default config;
