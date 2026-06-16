import sys
import os

# Add current folder to python path so modules can be imported
sys.path.insert(0, os.path.dirname(__file__))

# Import the FastAPI application from server.py
from server import app

# Import and wrap the application with ASGIMiddleware
from a2wsgi import ASGIMiddleware
application = ASGIMiddleware(app)
