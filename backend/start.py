import os
import sys

port = os.getenv('PORT', '8000')
workers = os.getenv('WEB_CONCURRENCY', '4')

cmd = [
    'gunicorn',
    'app.main:app',
    '--bind', f'0.0.0.0:{port}',
    '--workers', workers,
    '--worker-class', 'uvicorn.workers.UvicornWorker',
    '--timeout', '120',
    '--access-logfile', '-',
    '--error-logfile', '-',
    '--log-level', 'info'
]

os.execvp('gunicorn', cmd)
