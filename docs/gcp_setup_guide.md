# GCP setup guide

VenueFlow uses Google Cloud Run for hosting and Google Secret Manager for secure credential storage.

## 1. Create a GCP Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable billing for the project.

## 2. Enable Required APIs
Ensure the following APIs are enabled:
- Cloud Run API
- Artifact Registry API
- Secret Manager API
- Cloud Build API
- Generative AI API (for Gemini)

## 3. Configure Secret Manager
Create the following secrets in **Security > Secret Manager**:
1. `GEMINI_API_KEY`: Your Gemini 2.0 Flash key from Google AI Studio.
2. `MAPS_API_KEY`: Your Google Maps JavaScript API key.
3. `FIREBASE_CREDENTIALS`: The entire JSON string from your Firebase Service Account key file.

## 4. Setup Service Account
1. Go to **IAM & Admin > Service Accounts**.
2. Identify the default Compute Engine service account or create a new one for Cloud Run.
3. Grant it the role: `Secret Manager Secret Accessor`.

## 5. Deployment Overview
You will use the following command to deploy (adjust Project ID and region):
```bash
gcloud run deploy venueflow \
  --image gcr.io/[PROJECT_ID]/venueflow \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,MAPS_API_KEY=maps-api-key:latest,FIREBASE_CREDENTIALS=firebase-creds:latest" \
  --port 8080
```gc


Set Project & Region

gcloud config set project codelab2-490910
gcloud config set run/region us-central1

2. Enable Required APIs

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  aiplatform.googleapis.com

3. Create Secrets (Secret Manager)

echo -n "YOUR_GEMINI_API_KEY" | \
gcloud secrets create gemini-api-key --data-file=-

Maps API Key

echo -n "YOUR_MAPS_API_KEY" | \
gcloud secrets create maps-api-key --data-file=-

Firebase Credentials (JSON)
gcloud secrets create firebase-creds \
  --data-file=path/to/serviceAccountKey.json


4. Setup Service Account Permissions
gcloud iam service-accounts list
gcloud projects add-iam-policy-binding codelab2-490910 \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"