# Google Maps setup guide

VenueFlow uses the Google Maps JavaScript API for the Staff Heatmap and Attendee Walking Directions.

## 1. Get an API Key
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Click **Create Credentials > API Key**.
4. Copy the key and store it in your `.env` as `MAPS_API_KEY`.

## 2. Enable Maps APIs
You must enable the following services for the key to work:
- **Maps JavaScript API**: For rendering the map and heatmap.
- **Directions API**: For calculating walking routes to entry points.

## 3. Configure API Key Restrictions (Recommended)
To prevent unauthorized use:
1. Edit the API key in the console.
2. Under **Application restrictions**, select **Websites**.
3. Add your local development URL (`http://localhost:5173`) and your Cloud Run URL.
4. Under **API restrictions**, restrict the key to the two APIs listed above.

## 4. Usage in Registry
- The key is used in `backend/config.py` (injected into the environment).
- The key is used in `frontend/src/components/VenueMap.jsx` via the `VITE_MAPS_API_KEY` environment variable.
