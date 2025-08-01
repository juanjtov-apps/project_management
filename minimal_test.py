#!/usr/bin/env python3
"""
Absolute minimal test to see if ANY Python web server works
"""
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = json.dumps({"status": "ok", "message": "minimal server running"})
            self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()
            
    def do_POST(self):
        if self.path == '/api/projects':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = json.dumps({"id": "test", "message": "project created"})
            self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    server = HTTPServer(('0.0.0.0', 8000), SimpleHandler)
    print("🚀 Minimal HTTP server starting on port 8000...")
    print("🔗 Test: curl http://localhost:8000/health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped")
        server.shutdown()

if __name__ == "__main__":
    run_server()