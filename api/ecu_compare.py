"""
ECU Binary Compare - Legacy Entry Point
This file redirects to the new modular app.py structure.
Use: python ecu_compare.py
Or directly: python app.py
"""

from app import create_app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
