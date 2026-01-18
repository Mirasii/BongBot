import Logger from '../helpers/interfaces.js';
import DatabasePool from '../services/databasePool.js';

export default {
    get default(): Logger {
        return DatabasePool.getInstance().getLoggerConnection();
    },
    /** 
     * Legacy log function has been updated to use the new _logger so that code uses it implicitly. 
     * Old code using LOGGER.log(error) will still work as expected, however it is recommended to use the new Logger interface directly.
     */
    async log(error: any) {
        const _logger = DatabasePool.getInstance().getLoggerConnection();
        if (!_logger) throw new Error('Logger not initialised');
        if (error instanceof Error) {
            _logger.error(error);
            return;
        }
        _logger.debug(typeof error === 'string' ? error : JSON.stringify(error));
    }
}