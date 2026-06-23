import logging
from config import settings

def get_logger(name: str) -> logging.Logger:
    """
    Create a logger with consistent formatting.

    Usage:
        from utils.logger import logger
        logger.info("Creating note")
        logger.error("Database error", exc_info=True)
    """
    logger = logging.getLogger(name)

    # Set log level from config
    log_level = getattr(logging, settings.log_level, logging.DEBUG)
    logger.setLevel(log_level)

    # Only add handler if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger

# Main logger instance - import this in other files
logger = get_logger("bear-notes")
