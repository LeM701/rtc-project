#!/bin/bash
set -e

echo "=== Backend : tests unitaires ==="
(cd backend && npm test)

echo ""
echo "=== Backend : tests d'integration ==="
(cd backend && npm run test:integration)

echo ""
echo "=== Frontend : tests ==="
(cd frontend && npm test)

echo ""
echo "=== Couverture : backend (unitaires) ==="
(cd backend && npm test -- --coverage)

echo ""
echo "=== Couverture : backend (integration) ==="
(cd backend && npm run test:integration -- --coverage)

echo ""
echo "=== Couverture : frontend ==="
(cd frontend && npm test -- --coverage)
