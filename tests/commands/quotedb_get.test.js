const { testQuoteCommand } = require('../utils/quoteTestUtils.js');
const quotedbGetCommand = require('../../src/commands/quotedb_get.js');

// Run the standardized quote command tests
testQuoteCommand(
    quotedbGetCommand,
    'get_quotes',
    'Recent Quotes',
    '/api/v1/quotes/search'
);
