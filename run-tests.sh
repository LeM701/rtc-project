#!/bin/bash
set -e
echo "=== Backend ==="
(cd backend && npm test && npm run test:integration)
echo "=== Frontend ==="
(cd frontend && npm test)
