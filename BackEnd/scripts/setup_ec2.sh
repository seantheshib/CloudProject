#!/bin/bash
# setup_ec2.sh — Automates the deployment of CloudGraph API on an Ubuntu EC2 instance.
# This script is intended to be used as 'User Data' in an AWS Launch Template.

set -e  # Exit on error

# ── 1. Update and install base dependencies ──────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y python3-pip python3-venv git curl libpq-dev build-essential

# ── 2. Clone the repository ──────────────────────────────────────────────────
REPO_URL="https://github.com/jazwinn/CloudProject.git"
INSTALL_DIR="/opt/cloudgraph"

mkdir -p $INSTALL_DIR
git clone $REPO_URL $INSTALL_DIR
cd $INSTALL_DIR/BackEnd

# ── 3. Set up Python virtual environment ───────────────────────────────────
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# ── 4. Configure Environment Variables ─────────────────────────────────────
# Note: You can also use AWS Secrets Manager or Parameter Store for better security.
# These will be written to a .env file for the FastAPI app to load.
cat <<EOF > .env
AWS_REGION=YOUR_REGION
S3_BUCKET_NAME=YOUR_BUCKET_NAME
DATABASE_URL=postgresql://user:password@endpoint:5432/dbname
COGNITO_REGION=YOUR_REGION
COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
COGNITO_APP_CLIENT_ID=YOUR_APP_CLIENT_ID
AWS_LAMBDA_FUNCTION_NAME=clustering_processor
EOF

# ── 5. Create Systemd Service for FastAPI ────────────────────────────────────
# This ensures the app starts on boot and restarts if it crashes.
cat <<EOF > /etc/systemd/system/cloudgraph-api.service
[Unit]
Description=Gunicorn instance to serve CloudGraph API
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=$INSTALL_DIR/BackEnd
Environment="PATH=$INSTALL_DIR/BackEnd/venv/bin"
ExecStart=$INSTALL_DIR/BackEnd/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

[Install]
WantedBy=multi-user.target
EOF

# ── 6. Start the service ───────────────────────────────────────────────────
systemctl start cloudgraph-api
systemctl enable cloudgraph-api

echo ">>> CloudGraph API setup complete and service started."
