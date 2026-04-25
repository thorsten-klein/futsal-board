#!/bin/bash -e
# Run the playwright tests with coverage

# Clean previous coverage data
rm -rf .nyc_output

# Run tests
npx playwright test --reporter=list "$@" 2>&1

# Clean previous coverage report
rm -rf coverage

# Generate coverage report if tests ran
if [ -d .nyc_output ] && [ "$(ls -A .nyc_output 2>/dev/null)" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Coverage Report"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    npx nyc report --reporter=text --reporter=html --report-dir=coverage
    echo ""
    echo "HTML coverage report: coverage/index.html"
fi
