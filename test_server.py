from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime

class TestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/test':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "message": "Python server is running!",
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/test-post':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            print(f"=== PYTHON SERVER RECEIVED POST ===")
            print(f"Path: {self.path}")
            print(f"Headers: {dict(self.headers)}")
            print(f"Body: {post_data.decode()}")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "success": True,
                "message": "POST received by Python server",
                "timestamp": datetime.now().isoformat(),
                "received_data": post_data.decode()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{datetime.now().isoformat()}] {format % args}")

if __name__ == '__main__':
    server_address = ('', 3002)
    httpd = HTTPServer(server_address, TestHandler)
    print(f"Python test server running on port 3002")
    print(f"Test endpoints:")
    print(f"  GET  http://localhost:3002/test")
    print(f"  POST http://localhost:3002/test-post")
    print(f"  GET  http://192.168.1.229:3002/test")
    print(f"  POST http://192.168.1.229:3002/test-post")
    httpd.serve_forever()
