module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>.+dist/.+', '.cache'],
  moduleNameMapper: {
    '@ts-stack/markdown': '<rootDir>/../markdown/src'
  }
};