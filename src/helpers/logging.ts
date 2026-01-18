import Logger from '../helpers/interfaces.js';
import DatabasePool from '../services/databasePool.js';
import FileLogger from '../loggers/file_logger.js';

export default {
    get default(): Logger {
        if (process.env.DEFAULT_LOGGER === 'file') return new FileLogger(); /** use environment variable to switch loggers for local dev */
        return DatabasePool.getInstance().getLoggerConnection();
    },
    /** 
     * Legacy log function has been updated to use the new DefaultLogger so that code uses it implicitly. 
     * Old code using LOGGER.log(error) will still work as expected, however it is recommended to use the new Logger interface directly.
     * New folder structure places loggers in src/loggers - if additional loggers are created, they should have get functions here.
     * This file is now intended to surface loggers, e.g. LOGGER.default, LOGGER.custom_logger, etc.
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