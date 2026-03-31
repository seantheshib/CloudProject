# CloudGraph

An interactive, Obsidian-style force-directed knowledge graph for photo memories. Photos are uploaded, processed by AWS Lambda, and rendered as a physics-based graph where nodes cluster dynamically by **location**, **time period**, and **people**.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Frontend](#frontend)
3. [Backend](#backend)
   - [Architecture](#architecture)
   - [API Endpoints](#api-endpoints)
   - [Database Schema](#database-schema)
   - [Authentication](#authentication)
   - [Lambda Functions](#lambda-functions)
   - [Project Structure](#project-structure)
4. [Full AWS Deployment Guide](#full-aws-deployment-guide)
   - [Phase 1: Security & Infrastructure](#phase-1-security--infrastructure)
   - [Phase 2: Backend & Lambdas](#phase-2-backend--lambdas-ec2)
   - [Phase 3: React Frontend](#phase-3-react-frontend-aws-amplify)

---

## Project Overview

CloudGraph is a full-stack cloud application with two main parts:

- **FrontEnd** — a React/Vite app that renders photos as an interactive force-directed graph with dynamic clustering, smooth animations, and a dark cinematic aesthetic inspired by Obsidian's graph view.
- **BackEnd** — a FastAPI server backed by AWS (S3, Lambda, Cognito, RDS PostgreSQL) that handles authenticated uploads, EXIF extraction, thumbnail generation, graph relationship building, and DBSCAN clustering.

---

## Frontend

### Features
- Force-directed graph with physics-based node simulation
- Dynamic clustering — switch between Location, Timeline, and People filters
- Hover interactions — tooltips reveal photo metadata and highlight connections
- Smooth animations when switching cluster modes
- Canvas rendering for 120+ nodes at 60fps
- Dark, cinematic aesthetic

### Getting Started

```bash
cd FrontEnd
npm install
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

### Structure

```
FrontEnd/src/
├── main.jsx                    # Entry point
├── App.jsx                     # Root component
├── index.css                   # Global styles & CSS variables
├── components/
│   ├── GraphCanvas.jsx         # Main canvas + render loop
│   ├── FilterBar.jsx           # Filter toggle buttons
│   ├── Legend.jsx              # Cluster color legend
│   ├── Tooltip.jsx             # Hover tooltip
│   └── StatsPanel.jsx          # Photo/connection/cluster counts
├── data/
│   └── photos.js               # Sample data generation
└── hooks/
    └── useForceSimulation.js   # Force-directed physics engine
```

### Customization
- **Photo count**: Change the argument in `generatePhotos(120)` inside `GraphCanvas.jsx`
- **Cluster categories**: Edit `locations`, `timePeriods`, and `people` arrays in `src/data/photos.js`
- **Colors**: Modify CSS variables in `src/index.css` or cluster color values in `photos.js`
- **Physics**: Tune repulsion, spring, and damping constants in `useForceSimulation.js`

---

## Backend

A FastAPI backend handling authenticated photo uploads, automated EXIF extraction, thumbnail generation, graph relationship building, and DBSCAN-based photo clustering — running on a serverless AWS architecture with a PostgreSQL database.

### Architecture

```
Client
  │
  ▼
FastAPI (EC2 / Docker)
  │
  ├── POST /api/upload ──────► S3 Bucket (uploads/{user_id}/{uuid}.ext)
  │                                  │
  │                          S3 ObjectCreated event
  │                          ┌───────┴────────┐
  │                          ▼                ▼
  │                 image_processor.py   thumbnail_generator.py
  │                 (EXIF → SQL DB)      (300x300 JPEG → S3)
  │
  ├── GET /api/graph ────────► SQL DB → Haversine + time comparison → D3-ready JSON
  │
  └── GET /api/clusters ─────► SQL DB → DBSCAN → cluster labels + geocoding
                                    └── (large libraries) → Lambda async → SQL cache
```

**AWS services used:** S3, Lambda, Cognito, RDS (PostgreSQL)

---

### API Endpoints

#### `GET /health`
Simple liveness check.
```json
{ "status": "ok" }
```

---

#### `POST /api/upload`
Upload a photo. The file is stored in S3 under `uploads/{user_id}/{uuid}.ext`. Lambda functions automatically handle EXIF extraction and thumbnail generation in the background.

**Auth:** `Authorization: Bearer <cognito_token>`
**Body:** `multipart/form-data` — `file` field (JPEG, PNG, or HEIC)

```json
{
  "file_key": "uploads/user-sub/uuid.jpg",
  "presigned_url": "https://s3.amazonaws.com/...",
  "message": "Upload successful. Background processing initiated."
}
```
The `presigned_url` is valid for 1 hour.

---

#### `GET /api/graph`
Returns a graph of relationships between the user's photos based on time and geographic proximity. Designed to feed directly into D3.js or Cytoscape.

**Auth:** `Authorization: Bearer <cognito_token>`

| Parameter | Default | Description |
|-----------|---------|-------------|
| `time_threshold_minutes` | `60` | Max time gap (minutes) to create a time edge |
| `distance_threshold_km` | `1.0` | Max distance (km) to create a location edge |

```json
{
  "nodes": [
    { "id": "uploads/user/uuid.jpg", "date_taken": "2023-10-12T14:30:00", "gps_lat": 48.8566, "gps_lon": 2.3522 }
  ],
  "edges": [
    { "source": "uploads/user/uuid1.jpg", "target": "uploads/user/uuid2.jpg", "relationship": "time+location" }
  ]
}
```
Edge `relationship` values: `"time"`, `"location"`, or `"time+location"`.

---

#### `GET /api/clusters`
Groups the user's photos into clusters using a pure Python DBSCAN implementation. Clusters are labelled with a human-readable date and city name (e.g. `2023-10-12 · Paris`) via Nominatim geocoding.

For larger libraries, clustering is offloaded to an async Lambda and the result is cached in the database. Requests within 10 minutes of a completed run return the cached result instantly.

**Auth:** `Authorization: Bearer <cognito_token>`

| Parameter | Default | Description |
|-----------|---------|-------------|
| `mode` | `"combined"` | `"time"`, `"location"`, or `"combined"` |
| `time_eps_minutes` | `60` | DBSCAN epsilon for time axis (minutes) |
| `distance_eps_km` | `1.0` | DBSCAN epsilon for location axis (km) |
| `min_samples` | `2` | Minimum photos to form a cluster |

```json
{
  "clusters": [
    {
      "cluster_id": "uuid",
      "label": "2023-10-12 · Paris",
      "photo_ids": ["uploads/user/uuid1.jpg", "uploads/user/uuid2.jpg"],
      "centroid_lat": 48.8566,
      "centroid_lon": 2.3522
    }
  ],
  "unclustered": ["uploads/user/uuid3.jpg"]
}
```

---

### Database Schema

Tables are created by running `python BackEnd/scripts/setup_database.py` once.

#### `image_metadata`

| Column | Type | Description |
|--------|------|-------------|
| `image_id` | VARCHAR (PK) | S3 object key |
| `user_id` | VARCHAR | Cognito user `sub` |
| `uploaded_at` | VARCHAR | ISO 8601 upload timestamp |
| `date_taken` | VARCHAR (nullable) | ISO 8601 date from EXIF |
| `gps_lat` | FLOAT (nullable) | Latitude from EXIF GPS |
| `gps_lon` | FLOAT (nullable) | Longitude from EXIF GPS |
| `thumbnail_key` | VARCHAR (nullable) | S3 key of the generated thumbnail |

#### `cluster_results`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `user_id` | VARCHAR | Cognito user `sub` |
| `computed_at` | VARCHAR | ISO 8601 timestamp of when clustering ran |
| `mode` | VARCHAR | Clustering mode used |
| `result` | TEXT | Full cluster result serialised as JSON |

---

### Authentication

All endpoints (except `/health`) require a Cognito JWT in the `Authorization: Bearer <token>` header. The `get_current_user` dependency validates the token by fetching the JWKS from Cognito's `.well-known` endpoint, verifying the RS256 signature, and returning the user's `sub` as their unique ID. Both `id` tokens and `access` tokens are supported.

---

### Lambda Functions

| Function | Trigger | Responsibility |
|----------|---------|----------------|
| `image_processor.py` | `s3:ObjectCreated:*` on `uploads/` | Extracts EXIF date + GPS and writes to `image_metadata` |
| `thumbnail_generator.py` | `s3:ObjectCreated:*` on `uploads/` | Generates a 300×300 JPEG thumbnail, uploads to `thumbnails/`, updates `thumbnail_key` |
| `clustering_processor.py` | Async Lambda invocation from `/api/clusters` | Runs DBSCAN and saves result to `cluster_results` |

---

### Project Structure

```
BackEnd/
├── main.py                        # FastAPI app, CORS, router registration
├── config.py                      # Pydantic settings (loaded from .env)
├── Dockerfile
├── requirements.txt
├── .env.example
├── auth/
│   └── cognito.py                 # JWT verification dependency
├── routers/
│   ├── upload.py                  # POST /api/upload
│   ├── graph.py                   # GET /api/graph
│   └── clusters.py                # GET /api/clusters
├── services/
│   ├── database.py                # SQLAlchemy engine, models, session context
│   ├── dynamo_service.py          # save_image_metadata() (writes to SQL)
│   ├── s3_service.py              # S3 upload + presigned URL generation
│   ├── lambda_service.py          # invoke_clustering_lambda()
│   ├── graph_service.py           # build_graph() — Haversine + time edge logic
│   ├── clustering_service.py      # compute_clusters() — pure Python DBSCAN
│   └── exif_service.py            # extract_exif_metadata() — piexif + Pillow
├── lambda/
│   ├── image_processor.py         # S3-triggered EXIF extraction
│   ├── thumbnail_generator.py     # S3-triggered thumbnail generation
│   └── clustering_processor.py    # Async Lambda DBSCAN worker
├── scripts/
│   ├── setup_database.py          # Creates SQL tables (run once)
│   ├── setup_lambda_triggers.py   # Prints S3 trigger config instructions
│   └── deploy_lambda.sh           # Zips and deploys Lambda functions
└── utils/
    ├── geo.py                     # Haversine distance formula
    └── geocode.py                 # Nominatim reverse geocoding
```

---

## Full AWS Deployment Guide

### Phase 1: Security & Infrastructure

#### 1. Amazon Cognito (Authentication)
1. Open the **AWS Cognito Console** → **Create user pool**
2. Select **Email** as the sign-in attribute
3. In the **App Integration** step, create a **Public client** (no client secret)
4. Note down your **User Pool ID** and **App Client ID**

#### 2. Amazon S3 (Photo Storage)
1. Open the **AWS S3 Console** → **Create bucket**
2. Name it uniquely (e.g. `cloudgraph-uploads-xyz`)
3. Leave Block Public Access **ON** — the backend generates presigned URLs, so the bucket does not need to be public
4. Enable **CORS** in the bucket permissions to allow your frontend domain to read files

#### 3. Amazon RDS (PostgreSQL Database)
1. Open the **AWS RDS Console** → **Create database**
2. Select **PostgreSQL** as the engine (or **Aurora PostgreSQL** for production)
3. Choose a `db.t3.micro` instance for development
4. Note down your **endpoint**, **port**, **username**, and **password**
5. Make sure its **Security Group** allows inbound connections on port `5432` from your EC2 instance

---

### Phase 2: Backend & Lambdas (EC2)

#### 1. Serverless Lambda Workers
1. Create 2 empty Lambda functions in the AWS Console: `thumbnail_generator` and `image_processor`. Choose **Python 3.10+** as the runtime
2. Give their IAM Execution Roles permission to read/write S3, and access your RDS database
3. Deploy from your local machine:
```bash
cd BackEnd
chmod +x scripts/deploy_lambda.sh
bash scripts/deploy_lambda.sh
```
4. In the AWS Console, set the **Handler** for each Lambda to `image_processor.lambda_handler` and `thumbnail_generator.lambda_handler`
5. In your S3 bucket's **Event Notifications**, create an `s3:ObjectCreated:*` event with prefix `uploads/` and route it to an **SNS Topic**. Subscribe both Lambdas to that topic.

#### 2. FastAPI Core Server (Amazon EC2)
1. Launch a new **Ubuntu 22.04 LTS** EC2 instance (`t2.micro` or larger)
2. Add an **Inbound Rule** to its security group: `Custom TCP`, port `8000`, source `Anywhere-IPv4`
3. SSH into the instance and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip git -y
git clone https://github.com/YOUR_GITHUB_USERNAME/CloudProject.git
cd CloudProject/BackEnd
pip install -r requirements.txt
```
4. Create your environment file:
```bash
nano .env
```
With the following contents:
```env
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_SESSION_TOKEN="..."         # omit if using long-term credentials
AWS_REGION="us-east-1"
S3_BUCKET_NAME="cloudgraph-uploads-xyz"
AWS_LAMBDA_FUNCTION_NAME="cloudgraph-cluster-processor"
DATABASE_URL="postgresql://user:password@your-rds-endpoint.rds.amazonaws.com:5432/cloudgraph"
COGNITO_REGION="us-east-1"
COGNITO_USER_POOL_ID="us-east-1_xxxxx"
COGNITO_APP_CLIENT_ID="xxxxxxxxx"
```
5. Create the database tables:
```bash
python scripts/setup_database.py
```
6. Start the server permanently in the background:
```bash
nohup uvicorn main:app --host 0.0.0.0 --port 8000 &
```
Your API is now live at `http://YOUR-EC2-IP:8000`. Interactive docs at `http://YOUR-EC2-IP:8000/docs`.

Alternatively, run with Docker:
```bash
docker build -t cloudgraph-backend .
docker run -p 8000:8000 --env-file .env cloudgraph-backend
```

---

### Phase 3: React Frontend (AWS Amplify)

#### 1. Update the API Base URL
In `FrontEnd/src/api.js`, point the app at your live backend:
```javascript
export const API_BASE = 'http://YOUR-EC2-IP:8000/api';
```

#### 2. Deploy to AWS Amplify
1. Push your updated code to GitHub
2. Open the **AWS Amplify Console** → **Host Web App**
3. Connect your GitHub repository and select your branch
4. Amplify auto-detects Vite and uses `npm run build` to compile the static assets
5. Click **Save and Deploy**

Amplify will provide a live URL (e.g. `https://main.xyz.amplifyapp.com`). Navigate there, authenticate with a Cognito token, and your photos will upload, trigger the Lambda processors, and render to the D3 graph entirely in the cloud.

---

## 📚 API Guide Notebook
An interactive `BackEnd/api_guide.ipynb` Jupyter notebook is included for testing and debugging all endpoints locally using Python HTTP calls.
