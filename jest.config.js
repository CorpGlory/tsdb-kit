module.exports = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: [
    "<rootDir>/spec/setup_tests.ts"
  ],
  // TODO: folder structure defualt for jest, so
  //       no preference about the testRegex
  testRegex: "(\\.|/)([jt]est)\\.[jt]s$"
};
