// Uses only the versioned local rollback rules and demo emulators.
process.argv.push('--rollback');
require('./test-security-rules.cjs');
