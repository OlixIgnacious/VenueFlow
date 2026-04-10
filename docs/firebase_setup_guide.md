# Firebase setup guide

To set up Firebase for VenueFlow, follow these steps:

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the prompts.
3. Disable Google Analytics for this hackathon project (optional).

## 2. Initialize Realtime Database
1. In the Firebase Console, go to **Build > Realtime Database**.
2. Click **Create Database**.
3. Select a location (e.g., `us-central1`).
4. Select **Start in test mode** for the hackathon (this allows anyone to read/write for 30 days — perfect for rapid development).
5. Click **Enable**.

## 3. Generate Service Account Key
1. Go to **Project Settings > Service accounts**.
2. Click **Generate new private key**.
3. Save the JSON file securely. You will need to paste its content into the `FIREBASE_CREDENTIALS` environment variable.

## 4. Get Database URL
1. Your Database URL is visible at the top of the Realtime Database dashboard (e.g., `https://venueflow-default-rtdb.firebaseio.com/`).
2. Add this to your `.env` as `FIREBASE_DATABASE_URL`.

## 5. Web Configuration (for Frontend)
1. Go to **Project Settings > General**.
2. Scroll down to **Your apps** and click the **Web icon (</>)** to register an app.
3. Copy the `firebaseConfig` object. You will need these values for:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
