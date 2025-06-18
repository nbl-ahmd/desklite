#!/bin/bash

# Create necessary directories
mkdir -p client/src/components
mkdir -p client/src/contexts
mkdir -p client/src/lib
mkdir -p server/src/models
mkdir -p server/src/routes
mkdir -p server/src/middleware

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env files if they don't exist
if [ ! -f "server/.env" ]; then
  echo "Creating server/.env..."
  cat > server/.env << EOL
MONGODB_URI=mongodb://localhost:27017/ledger-book
PORT=5000
JWT_SECRET=your_super_secret_key_here
EOL
fi

if [ ! -f "client/.env" ]; then
  echo "Creating client/.env..."
  cat > client/.env << EOL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
EOL
fi

echo "Setup complete! You can now run the development servers." 