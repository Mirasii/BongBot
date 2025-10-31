const { testQuoteCommand } = require('../utils/quoteTestUtils.js');
const quotedbGetRandomCommand = require('../../src/commands/quotedb_get_random.js');

// Run the standardized quote command tests
testQuoteCommand(
    quotedbGetRandomCommand,
    'random_quotes',
    'Random Quotes',
    '/api/v1/quotes/random'
);
