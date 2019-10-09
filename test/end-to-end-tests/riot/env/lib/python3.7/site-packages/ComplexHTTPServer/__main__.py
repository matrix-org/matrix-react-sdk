#!/bin/env python

try:
    # Python3
    import http.server as SimpleHTTPServer
    import http.server as BaseHTTPServer
    import socketserver as SocketServer
except ImportError:
    # Python 2
    import SimpleHTTPServer
    import BaseHTTPServer
    import SocketServer

import sys
import os

# The absolute path of the directoy for this file:
_ROOT = os.path.abspath(os.path.dirname(__file__))

class ThreadingSimpleServer(SocketServer.ThreadingMixIn,BaseHTTPServer.HTTPServer):
    pass

if sys.argv[1:]:
    port = int(sys.argv[1])
else:
    port = 8000

server = ThreadingSimpleServer(('', port), SimpleHTTPServer.SimpleHTTPRequestHandler)
print("Serving HTTP on 0.0.0.0 port",port,"...")

try:
    while 1:
        sys.stdout.flush()
        server.handle_request()
except KeyboardInterrupt:
    print("Finished")
