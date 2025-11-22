#!/usr/bin/env python3
"""
HTTP server that serves static files and proxies API requests to Databricks
"""
import os
import http.server
import socketserver
from urllib.parse import urlparse
import urllib.request
import json

# Try to import Databricks SDK for config
try:
    from databricks.sdk.config import Config as SdkConfig
    DATABRICKS_SDK_AVAILABLE = True
except ImportError:
    DATABRICKS_SDK_AVAILABLE = False
    print("⚠️  Databricks SDK not available, using environment variables only")

PORT = int(os.getenv('PORT', 8080))

# Get Databricks configuration
def get_databricks_config():
    """Get Databricks host from SDK config"""
    if DATABRICKS_SDK_AVAILABLE:
        try:
            cfg = SdkConfig()
            return {
                'host': cfg.host or os.getenv('DATABRICKS_HOST', ''),
                'token': os.getenv('DATABRICKS_TOKEN', ''),  # For local dev
            }
        except Exception as e:
            print(f"⚠️  Could not get SDK config: {e}")
    
    return {
        'host': os.getenv('DATABRICKS_HOST', ''),
        'token': os.getenv('DATABRICKS_TOKEN', ''),
    }

# Initialize config
databricks_config = get_databricks_config()

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='dist', **kwargs)
    
    def proxy_api_request(self, method='GET', body=None):
        """Proxy API requests to Databricks"""
        try:
            # Get Databricks host
            host = databricks_config['host']
            if not host:
                self.send_error(500, "Databricks host not configured")
                return
            
            # Build full URL
            url = f"https://{host}{self.path}"
            print(f"🔄 Proxying {method} {url}")
            
            # Create request with headers
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Databricks-App/1.0',
            }
            
            # Get OBO token from X-Forwarded-Access-Token header (Databricks Apps)
            obo_token = self.headers.get('X-Forwarded-Access-Token')
            if obo_token:
                headers['Authorization'] = f'Bearer {obo_token}'
                print(f"🔐 Using OBO token from X-Forwarded-Access-Token")
            elif 'Authorization' in self.headers:
                headers['Authorization'] = self.headers['Authorization']
                print(f"🔐 Using Authorization header from request")
            else:
                print(f"⚠️ No authentication token found!")
            
            # Make the request
            req = urllib.request.Request(url, headers=headers, method=method)
            if body:
                req.data = body
            
            with urllib.request.urlopen(req) as response:
                # Send response back to client
                self.send_response(response.status)
                for header, value in response.headers.items():
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(header, value)
                self.end_headers()
                self.wfile.write(response.read())
                
        except urllib.error.HTTPError as e:
            print(f"❌ API Error {e.code}: {e.reason}")
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_body = e.read() if e.fp else b'{}'
            self.wfile.write(error_body)
        except Exception as e:
            print(f"❌ Proxy error: {e}")
            self.send_error(500, f"Proxy error: {str(e)}")
    
    def do_GET(self):
        # Proxy API requests to Databricks
        if self.path.startswith('/api/'):
            self.proxy_api_request('GET')
            return
        
        # Inject config for /config.js requests
        if self.path == '/config.js':
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            
            # Get values from config and environment
            # Use SDK config for host (OBO-aware)
            databricks_host = databricks_config['host']
            
            # Get resource IDs from environment (set via valueFrom in app.yaml)
            genie_space_id = os.getenv('GENIE_SPACE_ID', '')
            sql_warehouse_id = os.getenv('SQL_WAREHOUSE_ID', '')
            
            # Get OAuth/OBO info if available
            client_id = os.getenv('DATABRICKS_CLIENT_ID', '')
            is_obo = bool(client_id)  # If client_id exists, we're using OBO
            
            # Log what we're sending
            print(f"📤 Serving config.js:")
            print(f"   databricksHost: {databricks_host}")
            print(f"   genieSpaceId: {genie_space_id}")
            print(f"   sqlWarehouseId: {sql_warehouse_id}")
            print(f"   usingOBO: {is_obo}")
            
            # Generate JavaScript config
            config_js = f"""
// Runtime configuration injected by server
window.APP_CONFIG = {{
  databricksHost: '{databricks_host or ''}',
  genieSpaceId: '{genie_space_id}',
  sqlWarehouseId: '{sql_warehouse_id}',
  isOBO: {str(is_obo).lower()},
  clientId: '{client_id}'
}};
console.log('✅ Runtime config loaded from server:', window.APP_CONFIG);
console.log('🔐 Authentication mode:', window.APP_CONFIG.isOBO ? 'OAuth/OBO' : 'Token');
"""
            self.wfile.write(config_js.encode())
        else:
            # Serve static files normally
            super().do_GET()
    
    def end_headers(self):
        # Add no-cache headers for HTML files to prevent stale content
        if self.path.endswith('.html') or self.path == '/' or self.path == '/index.html':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()
    
    def do_POST(self):
        # Proxy API requests to Databricks
        if self.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            self.proxy_api_request('POST', body)
            return
        
        # For non-API POST requests, return 405
        self.send_error(405, "Method not allowed")
    
    def do_DELETE(self):
        # Proxy DELETE requests to Databricks
        if self.path.startswith('/api/'):
            self.proxy_api_request('DELETE')
            return
        
        # For non-API DELETE requests, return 405
        self.send_error(405, "Method not allowed")
    
    def do_PUT(self):
        # Proxy PUT requests to Databricks
        if self.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            self.proxy_api_request('PUT', body)
            return
        
        # For non-API PUT requests, return 405
        self.send_error(405, "Method not allowed")
    
    def do_PATCH(self):
        # Proxy PATCH requests to Databricks
        if self.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            self.proxy_api_request('PATCH', body)
            return
        
        # For non-API PATCH requests, return 405
        self.send_error(405, "Method not allowed")

if __name__ == '__main__':
    # Debug: Print configuration
    print("=" * 60)
    print("🔧 Configuration Check:")
    print(f"   Databricks Host (from SDK): {databricks_config['host']}")
    print(f"   DATABRICKS_HOST (env): {os.getenv('DATABRICKS_HOST', 'NOT SET')}")
    print(f"   GENIE_SPACE_ID: {os.getenv('GENIE_SPACE_ID', 'NOT SET')}")
    print(f"   SQL_WAREHOUSE_ID: {os.getenv('SQL_WAREHOUSE_ID', 'NOT SET')}")
    print(f"   DATABRICKS_CLIENT_ID: {os.getenv('DATABRICKS_CLIENT_ID', 'NOT SET')[:20] + '...' if os.getenv('DATABRICKS_CLIENT_ID') else 'NOT SET'}")
    print(f"   OAuth/OBO Mode: {'YES' if os.getenv('DATABRICKS_CLIENT_ID') else 'NO'}")
    print(f"   PORT: {PORT}")
    print("=" * 60)
    
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"🚀 Server started successfully on port {PORT}")
        print(f"📁 Serving files from: dist/")
        print(f"🌐 Access at: http://localhost:{PORT}")
        httpd.serve_forever()

