#!/bin/bash

# Legacy startup script - redirects to new robust startup script
# This maintains backward compatibility while using the improved startup process

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Use the new robust startup script
exec "$SCRIPT_DIR/start-servers.sh"