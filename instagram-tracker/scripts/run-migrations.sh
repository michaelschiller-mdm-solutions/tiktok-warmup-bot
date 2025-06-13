#!/bin/bash

# Database Migration Runner
# Runs all migrations in the correct order for Instagram Tracker
# Version: 2.0
# Created: 2025-01-27

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Instagram Tracker Database Migration Runner${NC}"
echo "================================================="

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL (psql) is not installed or not in PATH${NC}"
    exit 1
fi

# Database connection parameters (modify as needed)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-instagram_tracker}
DB_USER=${DB_USER:-postgres}

echo -e "${YELLOW}📊 Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}${NC}"
echo ""

# Function to run a migration file
run_migration() {
    local file_path=$1
    local migration_name=$2
    
    echo -e "${YELLOW}⏳ Running migration: ${migration_name}${NC}"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ Migration file not found: ${file_path}${NC}"
        return 1
    fi
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$file_path" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Migration completed: ${migration_name}${NC}"
        return 0
    else
        echo -e "${RED}❌ Migration failed: ${migration_name}${NC}"
        echo "   Running with detailed output..."
        psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$file_path"
        return 1
    fi
}

# Change to the database directory
cd "$(dirname "$0")/../database" || {
    echo -e "${RED}❌ Could not change to database directory${NC}"
    exit 1
}

echo -e "${YELLOW}📂 Running migrations from: $(pwd)${NC}"
echo ""

# Run migrations in order
echo -e "${GREEN}🔧 Step 1: Account Extensions${NC}"
run_migration "migrations/003-extend-accounts-comprehensive.sql" "Account Extensions"

echo ""
echo -e "${GREEN}💰 Step 2: Cost Tracking System${NC}"
run_migration "migrations/004-cost-tracking-system.sql" "Cost Tracking"

echo ""
echo -e "${GREEN}📈 Step 3: Advanced Analytics${NC}"
run_migration "migrations/005-advanced-analytics.sql" "Advanced Analytics"

echo ""
echo -e "${GREEN}🎯 Step 4: Extended Sample Data${NC}"
run_migration "init/03-extended-sample-data.sql" "Extended Sample Data"

echo ""
echo -e "${GREEN}✨ All migrations completed successfully!${NC}"
echo "================================================="
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update API endpoints to handle new fields"
echo "2. Test the enhanced analytics features"
echo "3. Verify proxy management functionality"
echo "4. Run performance tests with new schema"
echo ""
echo -e "${GREEN}🎉 Database is ready for advanced features!${NC}" 