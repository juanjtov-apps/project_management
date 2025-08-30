import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("uvicorn.error")

class LogRequests(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.time()
        logger.info(f"🔵 INCOMING: {request.method} {request.url.path}")
        try:
            response = await call_next(request)
            dur = (time.time() - start) * 1000
            logger.info(f"🟢 RESPONSE: {request.method} {request.url.path} -> {response.status_code} in {dur:.1f}ms")
            return response
        except Exception as e:
            dur = (time.time() - start) * 1000
            logger.error(f"🔴 ERROR: {request.method} {request.url.path} -> {str(e)} in {dur:.1f}ms")
            raise
        finally:
            logger.info(f"🔵 FINISHED: {request.method} {request.url.path}")