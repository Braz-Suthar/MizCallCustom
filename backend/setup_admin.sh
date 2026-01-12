#!/bin/bash

echo "🔧 MizCall Admin Backend Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << 'EOF'
# API Configuration
API_PORT=3100
JWT_SECRET=mizcall_dev_secret_change_in_production_2026

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mizcall
DB_USER=postgres
DB_PASSWORD=postgres

# Admin Panel Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$rZ.4Hoa9Ory4PYv5wkcPKOGg8Cfay.PWpX6KCNjDkl.UedTGdKGo.

# Mediasoup Configuration
MEDIASOUP_HOST=localhost
MEDIASOUP_PORT=4000

# Recorder Configuration
RECORDER_WS=ws://localhost:9000
EOF
    echo "✅ .env file created!"
    echo ""
else
    # Check if admin credentials exist
    if ! grep -q "ADMIN_USERNAME" .env; then
        echo "⚠️  Adding admin credentials to .env..."
        cat >> .env << 'EOF'

# Admin Panel Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$rZ.4Hoa9Ory4PYv5wkcPKOGg8Cfay.PWpX6KCNjDkl.UedTGdKGo.
EOF
        echo "✅ Admin credentials added!"
        echo ""
    else
        echo "✅ .env file exists with admin credentials"
        echo ""
    fi
fi

echo "📋 Current Admin Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⚠️  REMEMBER TO CHANGE THESE IN PRODUCTION!"
echo ""
echo "🚀 Starting backend server..."
echo ""

npm start
