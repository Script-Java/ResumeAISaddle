import sys
import os

# Add the current directory (api) to the Python path
# This allows `from app.main import app` to resolve correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
