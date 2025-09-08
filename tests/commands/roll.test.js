
const { setupMediaCommandTest } = require('../utils/commandTestUtils');

// Use the shared utility to eliminate code duplication
// Note: roll command has a special filename (koroneroll.mp4) different from command name
setupMediaCommandTest('roll', 'koroneroll.mp4');

