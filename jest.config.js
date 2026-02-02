module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@nestjs/(.*)$': '<rootDir>/node_modules/@nestjs/$1',
    '^@nest-toolbox/(.*)$': '<rootDir>/packages/$1/src'
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: {
        warnOnly: true
      }
    }
  }
};