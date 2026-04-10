#!/bin/bash
# setup_gcp_secrets.sh
# Automates the creation of secrets and Workload Identity Federation for VenueFlow

PROJECT_ID="codelab2-490910"
PROJECT_NUMBER="329848942915"
REPO="OlixIgnacious/VenueFlow" # Ensure this matches your GitHub repo name

echo "🚀 Starting VenueFlow GCP Security Setup..."

# 1. Enable Required APIs
gcloud services enable iam.googleapis.com \
    sts.googleapis.com \
    secretmanager.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    --project="${PROJECT_ID}"

# 2. Create Secrets in Secret Manager
echo "🔐 Creating secrets..."

create_secret() {
    local name=$1
    local value=$2
    if gcloud secrets describe "${name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
        echo "Updating secret ${name}..."
    else
        gcloud secrets create "${name}" --replication-policy="automatic" --project="${PROJECT_ID}"
    fi
    echo -n "${value}" | gcloud secrets versions add "${name}" --data-file=- --project="${PROJECT_ID}"
}

# Values will be read from your local .env file
if [ -f .env ]; then
    echo "📖 Loading values from .env..."
    # We use a subshell to avoid polluting the current environment, but we need the variables.
    # We'll extract them specifically to handle the multi-line JSON in FIREBASE_CREDENTIALS.
    GEMINI_KEY=$(grep '^GEMINI_API_KEY=' .env | cut -d'=' -f2-)
    MAPS_KEY=$(grep '^MAPS_API_KEY=' .env | cut -d'=' -f2-)
    FIREBASE_URL=$(grep '^FIREBASE_DATABASE_URL=' .env | cut -d'=' -f2-)
    FIREBASE_CREDS=$(grep '^FIREBASE_CREDENTIALS=' .env | cut -d'=' -f2-)
    FIREBASE_API_KEY=$(grep '^VITE_FIREBASE_API_KEY=' .env | cut -d'=' -f2-)
    FIREBASE_PROJECT_ID=$(grep '^VITE_FIREBASE_PROJECT_ID=' .env | cut -d'=' -f2-)
    ADMIN_KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d'=' -f2-)
else
    echo "❌ .env file not found! Please run this script from the project root."
    exit 1
fi

if [[ -z "$FIREBASE_CREDS" || -z "$GEMINI_KEY" ]]; then
    echo "❌ Missing required keys in .env (GEMINI_API_KEY or FIREBASE_CREDENTIALS)."
    exit 1
fi

create_secret "GEMINI_API_KEY" "${GEMINI_KEY//\'/}"
create_secret "MAPS_API_KEY" "${MAPS_KEY//\'/}"
create_secret "FIREBASE_DATABASE_URL" "${FIREBASE_URL//\'/}"
create_secret "FIREBASE_CREDENTIALS" "${FIREBASE_CREDS//\'/}"
create_secret "FIREBASE_API_KEY" "${FIREBASE_API_KEY//\'/}"
create_secret "FIREBASE_PROJECT_ID" "${FIREBASE_PROJECT_ID//\'/}"
create_secret "ADMIN_API_KEY" "${ADMIN_KEY//\'/}"

# 2.5 Create Artifact Registry Repository
echo "📦 Setting up Artifact Registry..."
if ! gcloud artifacts repositories describe "venue-flow" --location="us-central1" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud artifacts repositories create "venue-flow" \
        --repository-format="docker" \
        --location="us-central1" \
        --description="VenueFlow Container Repository" \
        --project="${PROJECT_ID}"
else
    echo "Artifact Registry repository 'venue-flow' already exists."
fi

# 3. Setup Workload Identity Federation
echo "🔗 Setting up Workload Identity Federation..."

# Create Pool if it doesn't exist
if ! gcloud iam workload-identity-pools describe "github-pool" --location="global" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools create "github-pool" \
        --project="${PROJECT_ID}" \
        --location="global" \
        --display-name="GitHub Actions Pool"
else
    echo "Workload Identity Pool 'github-pool' already exists."
fi

# Create/Update Provider
if ! gcloud iam workload-identity-pools providers describe "github-provider" --location="global" --workload-identity-pool="github-pool" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools providers create-oidc "github-provider" \
        --project="${PROJECT_ID}" \
        --location="global" \
        --workload-identity-pool="github-pool" \
        --display-name="GitHub Actions Provider" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository == '${REPO}'" \
        --issuer-uri="https://token.actions.githubusercontent.com"
else
    echo "Updating existing Workload Identity Provider 'github-provider'..."
    gcloud iam workload-identity-pools providers update-oidc "github-provider" \
        --project="${PROJECT_ID}" \
        --location="global" \
        --workload-identity-pool="github-pool" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository == '${REPO}'" \
        --issuer-uri="https://token.actions.githubusercontent.com"
fi

# 4. Create Service Account and Bind
echo "👤 Setting up Service Account..."
if ! gcloud iam service-accounts describe "github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud iam service-accounts create "github-actions-sa" \
        --project="${PROJECT_ID}" \
        --display-name="GitHub Actions Service Account"
else
    echo "Service account 'github-actions-sa' already exists."
fi

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet

# Grant Cloud Run runtime SA access to secrets (needed for native --update-secrets mounting)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.admin" \
    --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer" \
    --quiet

gcloud iam service-accounts add-iam-policy-binding "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.serviceAccountUser" \
    --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --quiet

gcloud iam service-accounts add-iam-policy-binding "github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${REPO}" \
    --quiet

# 5. Make Service Public (Optional for Hackathon)
echo "🌍 Making VenueFlow service public..."
gcloud run services add-iam-policy-binding venueflow \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region="us-central1" \
    --project="${PROJECT_ID}" \
    --quiet

echo "✅ Setup Complete!"
