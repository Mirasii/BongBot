
const { setupMediaCommandTest } = require('../utils/commandTestUtils');

// Use the shared utility to eliminate code duplication
// Note: command name is 'sea' but file is 'seachicken'
setupMediaCommandTest('sea', 'SeaChicken.mp4', 'seachicken');

