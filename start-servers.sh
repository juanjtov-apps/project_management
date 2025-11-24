#!/bin/bash

# Robust server startup script with health checks and error handling
# This script ensures both Node.js and Python servers start reliably

# Note: We don't use 'set -e' to allow graceful error handling

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_PORT=${PORT:-5000}
PYTHON_PORT=8000
MAX_STARTUP_WAIT=60  # Maximum seconds to wait for servers to start
HEALTH_CHECK_INTERVAL=2  # Seconds between health checks
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ERROR_LOG="/tmp/server-startup-errors.log"

cd "$SCRIPT_DIR"

# Function to print colored messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        log_warning "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
        sleep 1
        # Verify it's killed
        if check_port $port; then
            log_error "Failed to kill process on port $port"
            return 1
        fi
        log_success "Port $port is now free"
    fi
    return 0
}

# Function to check server health
check_node_health() {
    # Try to connect to the Node.js server
    if command -v curl &> /dev/null; then
        curl -s -f -o /dev/null --max-time 2 "http://127.0.0.1:$NODE_PORT/api/backend-status" 2>/dev/null
    else
        # Fallback: just check if port is listening
        check_port $NODE_PORT
    fi
}

check_python_health() {
    # Try to connect to the Python backend health endpoint
    if command -v curl &> /dev/null; then
        curl -s -f -o /dev/null --max-time 2 "http://127.0.0.1:$PYTHON_PORT/health" 2>/dev/null
    else
        # Fallback: just check if port is listening
        check_port $PYTHON_PORT
    fi
}

# Function to wait for server to be healthy
wait_for_health() {
    local check_func=$1
    local server_name=$2
    local max_wait=$3
    local elapsed=0
    
    log_info "Waiting for $server_name to be healthy..."
    
    while [ $elapsed -lt $max_wait ]; do
        if $check_func; then
            log_success "$server_name is healthy"
            return 0
        fi
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        echo -n "."
    done
    
    echo ""
    log_error "$server_name failed to become healthy within ${max_wait}s"
    return 1
}

# Track if we're exiting due to an error
EXIT_CODE=0
ERROR_OCCURRED=false
INTERRUPTED=false

# Function to log error to file
log_error_to_file() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "$ERROR_LOG"
}

# Signal handler for Ctrl+C
handle_interrupt() {
    INTERRUPTED=true
    cleanup
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    # If we're being called due to an error, preserve the exit code
    if [ "$ERROR_OCCURRED" = true ] || [ $exit_code -ne 0 ]; then
        EXIT_CODE=$exit_code
    fi
    
    echo ""
    if [ "$ERROR_OCCURRED" = true ] || [ $EXIT_CODE -ne 0 ]; then
        log_error "Shutting down due to error (exit code: $EXIT_CODE)"
    else
        log_info "Shutting down servers..."
    fi
    
    # Kill Node.js process
    if [ ! -z "$NODE_PID" ]; then
        log_info "Stopping Node.js server (PID: $NODE_PID)"
        kill $NODE_PID 2>/dev/null || true
        wait $NODE_PID 2>/dev/null || true
    fi
    
    # Kill Python backend process
    if [ ! -z "$PYTHON_PID" ]; then
        log_info "Stopping Python backend (PID: $PYTHON_PID)"
        kill $PYTHON_PID 2>/dev/null || true
        wait $PYTHON_PID 2>/dev/null || true
    fi
    # Also kill any other Python backend processes
    pkill -f "python.*main.py" 2>/dev/null || true
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    
    # Clean up ports if needed
    if check_port $NODE_PORT; then
        kill_port $NODE_PORT || true
    fi
    if check_port $PYTHON_PORT; then
        kill_port $PYTHON_PORT || true
    fi
    
    if [ "$ERROR_OCCURRED" = true ] || [ $EXIT_CODE -ne 0 ]; then
        log_error "Cleanup complete. Error occurred during startup."
        log_error_to_file "Server startup failed with exit code $EXIT_CODE"
        echo ""
        log_info "📋 Error Summary:"
        log_info "   Check the logs above for details"
        log_info "   Full server logs: /tmp/node-server.log"
        log_info "   Python backend logs: /tmp/python-backend.log"
        log_info "   Error log saved to: $ERROR_LOG"
        echo ""
        # If interrupted with Ctrl+C, exit immediately without waiting
        if [ "$INTERRUPTED" = true ]; then
            log_info "Interrupted by user - exiting immediately"
        elif [ -t 0 ] && [ -t 1 ]; then
            log_info "Press Enter to close this window..."
            read -r
        else
            log_info "Non-interactive terminal - waiting 5 seconds before exit"
            sleep 5  # Give user time to see the error
        fi
    else
        log_success "Cleanup complete"
        # If interrupted with Ctrl+C, exit immediately without waiting
        if [ "$INTERRUPTED" = true ]; then
            log_info "Interrupted by user - exiting immediately"
        elif [ -t 0 ] && [ -t 1 ]; then
            echo ""
            log_info "Press Enter to close this window..."
            read -r
        fi
    fi
    
    exit $EXIT_CODE
}

# Set up signal handlers
trap handle_interrupt SIGINT
trap cleanup SIGTERM EXIT

# Main startup sequence
log_info "🚀 Starting Proesphere servers..."

# Check and handle port conflicts
if check_port $NODE_PORT; then
    log_warning "Port $NODE_PORT is already in use"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port $NODE_PORT || {
            ERROR_OCCURRED=true
            EXIT_CODE=1
            log_error "Failed to kill process on port $NODE_PORT"
            cleanup
            exit $EXIT_CODE
        }
    else
        ERROR_OCCURRED=true
        EXIT_CODE=1
        log_error "Cannot start: port $NODE_PORT is in use"
        log_info "You can manually kill the process with: lsof -ti:$NODE_PORT | xargs kill"
        cleanup
        exit $EXIT_CODE
    fi
fi

if check_port $PYTHON_PORT; then
    log_warning "Port $PYTHON_PORT is already in use"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port $PYTHON_PORT || {
            log_warning "Failed to kill process on port $PYTHON_PORT, but continuing..."
        }
    else
        log_warning "Python backend may already be running"
    fi
fi

# Verify Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    ERROR_OCCURRED=true
    EXIT_CODE=1
    log_error "Python is not installed or not in PATH"
    log_info "Please install Python 3.8+ and ensure it's in your PATH"
    cleanup
    exit $EXIT_CODE
fi

# Verify Node.js is available
if ! command -v node &> /dev/null; then
    ERROR_OCCURRED=true
    EXIT_CODE=1
    log_error "Node.js is not installed or not in PATH"
    log_info "Please install Node.js and ensure it's in your PATH"
    cleanup
    exit $EXIT_CODE
fi

# Start Python backend independently
log_info "Starting Python backend on port $PYTHON_PORT..."
cd python_backend
python3 main.py > /tmp/python-backend.log 2>&1 &
PYTHON_PID=$!
cd ..
log_info "Python backend started (PID: $PYTHON_PID)"
log_info "Logs: tail -f /tmp/python-backend.log"

# Wait for Python backend to be ready
if ! wait_for_health check_python_health "Python backend" $MAX_STARTUP_WAIT; then
    ERROR_OCCURRED=true
    EXIT_CODE=1
    echo ""
    log_error "═══════════════════════════════════════════════════════════"
    log_error "Python backend failed to start"
    log_error "═══════════════════════════════════════════════════════════"
    log_error_to_file "Python backend failed to start after ${MAX_STARTUP_WAIT}s"
    echo ""
    log_info "Last 50 lines of Python backend logs:"
    echo "───────────────────────────────────────────────────────────────"
    tail -n 50 /tmp/python-backend.log 2>/dev/null || log_warning "Log file not found or empty"
    echo "───────────────────────────────────────────────────────────────"
    echo ""
    log_info "Troubleshooting steps:"
    log_info "  1. Check if port $PYTHON_PORT is available: lsof -i:$PYTHON_PORT"
    log_info "  2. Verify Python is installed: python3 --version"
    log_info "  3. Check Python dependencies: cd python_backend && pip list"
    log_info "  4. Verify DATABASE_URL is set: echo \$DATABASE_URL"
    log_info "  5. View full logs: tail -f /tmp/python-backend.log"
    log_info "  6. Check error log: cat $ERROR_LOG"
    echo ""
    cleanup
    exit $EXIT_CODE
fi

# Start Node.js server (frontend only - no backend spawning)
log_info "Starting Node.js server on port $NODE_PORT..."
NODE_ENV=development npx tsx server/index.ts > /tmp/node-server.log 2>&1 &
NODE_PID=$!

log_info "Node.js server started (PID: $NODE_PID)"
log_info "Logs: tail -f /tmp/node-server.log"

# Wait for Node.js server to be ready
if ! wait_for_health check_node_health "Node.js server" $MAX_STARTUP_WAIT; then
    ERROR_OCCURRED=true
    EXIT_CODE=1
    echo ""
    log_error "═══════════════════════════════════════════════════════════"
    log_error "Node.js server failed to start"
    log_error "═══════════════════════════════════════════════════════════"
    log_error_to_file "Node.js server failed to start after ${MAX_STARTUP_WAIT}s"
    echo ""
    log_info "Last 50 lines of Node.js logs:"
    echo "───────────────────────────────────────────────────────────────"
    tail -n 50 /tmp/node-server.log 2>/dev/null || log_warning "Log file not found or empty"
    echo "───────────────────────────────────────────────────────────────"
    echo ""
    log_info "Troubleshooting steps:"
    log_info "  1. Check if port $NODE_PORT is available: lsof -i:$NODE_PORT"
    log_info "  2. Verify Node.js is installed: node --version"
    log_info "  3. Check for syntax errors: npm run check"
    log_info "  4. View full logs: tail -f /tmp/node-server.log"
    log_info "  5. Check error log: cat $ERROR_LOG"
    echo ""
    cleanup
    exit $EXIT_CODE
fi

# Wait for Python backend to be ready
if ! wait_for_health check_python_health "Python backend" $MAX_STARTUP_WAIT; then
    ERROR_OCCURRED=true
    EXIT_CODE=1
    echo ""
    log_error "═══════════════════════════════════════════════════════════"
    log_error "Python backend failed to start"
    log_error "═══════════════════════════════════════════════════════════"
    log_error_to_file "Python backend failed to start after ${MAX_STARTUP_WAIT}s"
    echo ""
    log_info "Last 50 lines of Node.js logs (may contain Python errors):"
    echo "───────────────────────────────────────────────────────────────"
    tail -n 50 /tmp/node-server.log 2>/dev/null || log_warning "Log file not found or empty"
    echo "───────────────────────────────────────────────────────────────"
    echo ""
    log_info "Troubleshooting steps:"
    log_info "  1. Check if port $PYTHON_PORT is available: lsof -i:$PYTHON_PORT"
    log_info "  2. Verify Python is installed: python3 --version"
    log_info "  3. Check Python dependencies: cd python_backend && pip list"
    log_info "  4. Verify DATABASE_URL is set: echo \$DATABASE_URL"
    log_info "  5. View full logs: tail -f /tmp/node-server.log"
    log_info "  6. Check error log: cat $ERROR_LOG"
    echo ""
    cleanup
    exit $EXIT_CODE
fi

# Success!
echo ""
log_success "🎉 All servers are running!"
echo ""
echo "📊 Server Status:"
echo "   🌐 Frontend: http://localhost:$NODE_PORT"
echo "   🐍 Python API: http://localhost:$PYTHON_PORT"
echo "   📚 API Docs: http://localhost:$PYTHON_PORT/docs"
echo ""
echo "📝 Logs:"
echo "   Node.js: tail -f /tmp/node-server.log"
echo "   Python: tail -f /tmp/python-backend.log"
echo ""
echo "🛑 To stop servers: Press Ctrl+C or run:"
echo "   kill $NODE_PID $PYTHON_PID"
echo ""

# Keep script running and monitor health
log_info "Monitoring server health..."
while true; do
    sleep 30
    
    # Check if Python backend process is still running
    if [ ! -z "$PYTHON_PID" ] && ! kill -0 $PYTHON_PID 2>/dev/null; then
        ERROR_OCCURRED=true
        EXIT_CODE=1
        echo ""
        log_error "═══════════════════════════════════════════════════════════"
        log_error "Python backend process died unexpectedly"
        log_error "═══════════════════════════════════════════════════════════"
        log_error_to_file "Python backend process (PID: $PYTHON_PID) died unexpectedly"
        echo ""
        log_info "Last 50 lines of logs before crash:"
        echo "───────────────────────────────────────────────────────────────"
        tail -n 50 /tmp/python-backend.log 2>/dev/null || log_warning "Log file not found or empty"
        echo "───────────────────────────────────────────────────────────────"
        echo ""
        log_info "Check error log: cat $ERROR_LOG"
        echo ""
        cleanup
        exit $EXIT_CODE
    fi
    
    # Check if Node.js process is still running
    if ! kill -0 $NODE_PID 2>/dev/null; then
        ERROR_OCCURRED=true
        EXIT_CODE=1
        echo ""
        log_error "═══════════════════════════════════════════════════════════"
        log_error "Node.js server process died unexpectedly"
        log_error "═══════════════════════════════════════════════════════════"
        log_error_to_file "Node.js server process (PID: $NODE_PID) died unexpectedly"
        echo ""
        log_info "Last 50 lines of logs before crash:"
        echo "───────────────────────────────────────────────────────────────"
        tail -n 50 /tmp/node-server.log 2>/dev/null || log_warning "Log file not found or empty"
        echo "───────────────────────────────────────────────────────────────"
        echo ""
        log_info "Check error log: cat $ERROR_LOG"
        echo ""
        cleanup
        exit $EXIT_CODE
    fi
    
    # Periodic health checks
    if ! check_node_health; then
        log_warning "Node.js health check failed"
    fi
    
    if ! check_python_health; then
        log_warning "Python backend health check failed"
    fi
done

