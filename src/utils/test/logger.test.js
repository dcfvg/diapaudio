import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as logger from '../logger.js';

describe('logger', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Reset to default WARN level before each test
    logger.setLogLevel('WARN');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('setLogLevel / getLogLevel', () => {
    it('sets and gets log level', () => {
      logger.setLogLevel('ERROR');
      expect(logger.getLogLevel()).toBe('ERROR');

      logger.setLogLevel('DEBUG');
      expect(logger.getLogLevel()).toBe('DEBUG');

      logger.setLogLevel('INFO');
      expect(logger.getLogLevel()).toBe('INFO');

      logger.setLogLevel('WARN');
      expect(logger.getLogLevel()).toBe('WARN');
    });

    it('handles case-insensitive level names', () => {
      logger.setLogLevel('error');
      expect(logger.getLogLevel()).toBe('ERROR');

      logger.setLogLevel('debug');
      expect(logger.getLogLevel()).toBe('DEBUG');

      logger.setLogLevel('WaRn');
      expect(logger.getLogLevel()).toBe('WARN');
    });

    it('ignores invalid log levels', () => {
      logger.setLogLevel('WARN');
      logger.setLogLevel('INVALID');
      expect(logger.getLogLevel()).toBe('WARN'); // Should stay at WARN
    });

    it('defaults to WARN level', () => {
      // After reset in beforeEach
      expect(logger.getLogLevel()).toBe('WARN');
    });
  });

  describe('error', () => {
    it('logs when level is ERROR', () => {
      logger.setLogLevel('ERROR');
      logger.error('test error', 'arg1', 'arg2');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error', 'arg1', 'arg2');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('logs when level is WARN or higher', () => {
      logger.setLogLevel('WARN');
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
    });

    it('logs when level is INFO or higher', () => {
      logger.setLogLevel('INFO');
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
    });

    it('logs when level is DEBUG', () => {
      logger.setLogLevel('DEBUG');
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
    });

    it('logs with multiple arguments', () => {
      logger.setLogLevel('ERROR');
      const obj = { foo: 'bar' };
      logger.error('test error', obj, 123);
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error', obj, 123);
    });
  });

  describe('warn', () => {
    it('logs when level is WARN', () => {
      logger.setLogLevel('WARN');
      logger.warn('test warning', 'arg1');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test warning', 'arg1');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('logs when level is INFO or DEBUG', () => {
      logger.setLogLevel('INFO');
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test warning');

      consoleWarnSpy.mockClear();

      logger.setLogLevel('DEBUG');
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test warning');
    });

    it('does not log when level is ERROR', () => {
      logger.setLogLevel('ERROR');
      logger.warn('test warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('logs with multiple arguments', () => {
      logger.setLogLevel('WARN');
      logger.warn('warning:', 'something', 'happened');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning:', 'something', 'happened');
    });
  });

  describe('info', () => {
    it('logs when level is INFO', () => {
      logger.setLogLevel('INFO');
      logger.info('test info', 'arg1');
      expect(consoleLogSpy).toHaveBeenCalledWith('test info', 'arg1');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('logs when level is DEBUG', () => {
      logger.setLogLevel('DEBUG');
      logger.info('test info');
      expect(consoleLogSpy).toHaveBeenCalledWith('test info');
    });

    it('does not log when level is WARN', () => {
      logger.setLogLevel('WARN');
      logger.info('test info');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('does not log when level is ERROR', () => {
      logger.setLogLevel('ERROR');
      logger.info('test info');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('logs with multiple arguments', () => {
      logger.setLogLevel('INFO');
      const data = { status: 'ok' };
      logger.info('status update:', data);
      expect(consoleLogSpy).toHaveBeenCalledWith('status update:', data);
    });
  });

  describe('debug', () => {
    it('logs when level is DEBUG', () => {
      logger.setLogLevel('DEBUG');
      logger.debug('test debug', 'arg1');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'test debug', 'arg1');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('does not log when level is INFO', () => {
      logger.setLogLevel('INFO');
      logger.debug('test debug');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('does not log when level is WARN', () => {
      logger.setLogLevel('WARN');
      logger.debug('test debug');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('does not log when level is ERROR', () => {
      logger.setLogLevel('ERROR');
      logger.debug('test debug');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('prefixes messages with [DEBUG]', () => {
      logger.setLogLevel('DEBUG');
      logger.debug('diagnostic info');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'diagnostic info');
    });

    it('logs with multiple arguments', () => {
      logger.setLogLevel('DEBUG');
      logger.debug('variable:', 'value', 123);
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'variable:', 'value', 123);
    });
  });

  describe('log level hierarchy', () => {
    it('ERROR level only logs errors', () => {
      logger.setLogLevel('ERROR');
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    });

    it('WARN level logs errors and warnings', () => {
      logger.setLogLevel('WARN');
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    });

    it('INFO level logs errors, warnings, and info', () => {
      logger.setLogLevel('INFO');
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Only info, not debug
    });

    it('DEBUG level logs everything', () => {
      logger.setLogLevel('DEBUG');
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // info + debug
    });
  });

  describe('default export', () => {
    it('exports all functions as default object', async () => {
      const loggerDefault = (await import('../logger.js')).default;
      
      expect(typeof loggerDefault.setLogLevel).toBe('function');
      expect(typeof loggerDefault.getLogLevel).toBe('function');
      expect(typeof loggerDefault.error).toBe('function');
      expect(typeof loggerDefault.warn).toBe('function');
      expect(typeof loggerDefault.info).toBe('function');
      expect(typeof loggerDefault.debug).toBe('function');
    });
  });
});
