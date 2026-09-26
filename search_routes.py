import re
with open('backend/app/routers/groups.py', 'r', encoding='utf-8') as f:
    content = f.read()
for i, line in enumerate(content.split('\n'), 1):
    if '@router' in line and ('download' in line.lower() or 'documents' in line.lower()):
        print(f'{i}: {line}')
