import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/src/', '<rootDir>/test/'],
  moduleNameMapper: {
    '@ts-stack/markdown': '<rootDir>/dist/'
  },
};

export default config;
