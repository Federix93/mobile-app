# Genie Mobile App

Mobile-responsive React application for Databricks Genie with OAuth OBO authentication.

This app is **designed to run exclusively on Databricks Apps** and provides a mobile-optimized interface for interacting with Genie rooms.

---

## 🚀 Quick Start

### 1. Configure Resources in Databricks

Before deploying, create these resources in your Databricks workspace:

**Resource Keys (configure in Databricks Apps UI):**
- `genie-space-id` → Your Genie room/space ID
- `sql-warehouse` → Your SQL warehouse ID

**How to find these IDs:**

**Genie Space ID:**
1. Open a Genie room in Databricks
2. Copy the space ID from the URL: `https://your-workspace.cloud.databricks.com/genie/rooms/{space-id}`

**SQL Warehouse ID:**
1. Go to **SQL → Warehouses**
2. Click on a warehouse
3. Copy the ID from the URL or warehouse details page

### 2. Build the Application

```bash
npm install
npm run build
```

This creates optimized production files in the `dist/` folder.

### 3. Deploy to Databricks Apps

**Upload the following files to your Databricks App:**

```
Required files:
✅ app.yaml
✅ server.py
✅ requirements.txt
✅ All contents from dist/ folder (including assets/)
```

**Important:** Upload the **contents** of `dist/`, not the folder itself.

**Expected file structure in Databricks:**
```
/your-app-root/
├── app.yaml
├── server.py
├── requirements.txt
├── index.html
├── vite.svg
├── manifest.json
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── ...
```

### 4. Configure Resource Mappings

In the Databricks Apps UI, map your resources:

1. Go to **Apps** → Your App → **Settings**
2. Under **Resources**, add:
   - Key: `genie-space-id` → Value: Your Genie space ID
   - Key: `sql-warehouse` → Value: Your SQL warehouse ID

### 5. Start the App

Click **Start** in the Databricks Apps UI.

Your app will be available at:
```
https://your-workspace.cloud.databricks.com/apps/your-app-name
```

---

## 📱 Access on Mobile

### Open in Mobile Browser

Simply open your app URL in any mobile browser:
- **iOS**: Safari, Chrome
- **Android**: Chrome, Firefox, Edge

```
https://your-workspace.cloud.databricks.com/apps/your-app-name
```

### Install as Native App (PWA) ✨

The app is now a **Progressive Web App (PWA)** that installs like a native app:

**Android (Chrome/Edge):**
1. Open your deployed app URL in Chrome
2. You'll see an **"Install"** button in the address bar OR a banner at the bottom
3. Tap **"Install"** (NOT just "Add to Home screen")
4. The app will download and appear in your **app drawer**
5. Opens fullscreen without browser UI! 🎉

**iOS (Safari):**
1. Open the app in Safari
2. Tap the **Share** button (⬆️)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "Genie" and tap **"Add"**
5. App icon appears on your home screen
6. Opens fullscreen like a native app! 🎉

**What's the difference?**
- ✅ **True PWA Install**: Appears in app drawer, works offline, native experience
- ❌ **Shortcut**: Just a bookmark to the website

**After installing:**
- 🏠 App icon on home screen/app drawer
- 📵 Works offline (after first load)  
- 🔔 Native-like experience
- ⚡ Fast loading with service worker caching
- 📱 Fullscreen mode (no browser bars)

---

## 🔐 Authentication

The app uses **OAuth On-Behalf-Of (OBO)** authentication:

- **First access**: Redirected to Databricks login
- **Login**: Use your Databricks credentials
- **Subsequent visits**: Automatically authenticated
- **Security**: All API calls use your Databricks identity

The app automatically:
- ✅ Authenticates using OBO
- ✅ Fetches your user profile
- ✅ Displays your name and avatar
- ✅ Makes API calls on your behalf

---

## 🛠️ Technical Details

### Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Python HTTP server (serves static files + proxies API requests)
- **Authentication**: Databricks OAuth OBO
- **APIs**: Genie API, SQL Statements API, SCIM API

### How It Works

1. **Static Files**: `server.py` serves the React app from `dist/`
2. **Dynamic Config**: `/config.js` injects runtime configuration (Genie space, SQL warehouse)
3. **API Proxy**: All `/api/*` requests are proxied to Databricks APIs with OBO authentication
4. **Mobile Optimized**: Responsive design with touch-friendly UI

## 📂 Project Structure

```
genie_mobile_app/
├── app.yaml                # Databricks app configuration
├── server.py               # Python server for deployment
├── requirements.txt        # Python dependencies
├── package.json            # Node dependencies
├── vite.config.ts          # Build configuration
├── index.html              # HTML entry point
├── src/
│   ├── components/         # React components
│   │   ├── ChatInterface.tsx
│   │   └── MessageBubble.tsx
│   ├── services/           # API services
│   │   ├── auth.ts         # OAuth OBO authentication
│   │   └── genieApi.ts     # Genie API client
│   ├── store/              # State management (Zustand)
│   │   └── useAppStore.ts
│   ├── styles/             # Global styles
│   │   └── global.css
│   ├── App.tsx             # Main component
│   └── main.tsx            # Entry point
└── public/                 # Static assets
    └── manifest.json       # PWA manifest
```

---

## ✨ Key Features

✅ **OAuth OBO Authentication** - Secure authentication using your Databricks identity  
✅ **User Profile Display** - Shows your name and avatar from Databricks  
✅ **Single Genie Room** - Auto-connects to configured Genie room  
✅ **Mobile Optimized** - Responsive, touch-friendly design  
✅ **Real-time Chat** - Interactive conversation interface  
✅ **Rich Responses** - Displays query results as formatted tables  
✅ **SQL Query Results** - Fetches and displays actual data from queries  
✅ **Empty Results Handling** - Suggests clarifications when no data found  
✅ **Cancel Requests** - Stop long-running queries  
✅ **Works Offline** - Graceful error handling  
✅ **PWA Support** - Add to home screen for app-like experience  

---

## 🐛 Troubleshooting

### App Not Available

**Error**: "Databricks app you are trying to access is currently unavailable"

**Solutions:**
- Verify all files are uploaded correctly (especially `server.py` and `app.yaml`)
- Check that `requirements.txt` is present
- Ensure resource keys are configured: `genie-space-id` and `sql-warehouse`
- Restart the app from Databricks UI

### No Room Selected

**Error**: "No room selected. Select a Genie room to start chatting"

**Solutions:**
- Check that `genie-space-id` resource is configured correctly
- Verify the Genie space ID is valid
- Ensure you have access to the Genie room
- Check app logs for configuration errors

### 401 Unauthorized Errors

**Error**: API requests returning 401

**Solutions:**
- Verify OAuth is configured in `app.yaml`
- Check that scopes include `all-apis` and `sql`
- Restart the app to refresh authentication
- Ensure your user has access to Genie and SQL warehouses

### Query Results Not Showing

**Error**: Query description shows but no data table

**Solutions:**
- Check that SQL warehouse is running
- Verify `sql-warehouse` resource is configured correctly
- Check app logs for SQL execution errors
- Ensure your user has permission to execute queries

### Mobile Display Issues

**Problem**: App not responsive on mobile

**Solutions:**
- Clear browser cache
- Try in different browser (Safari on iOS, Chrome on Android)
- Check viewport settings are not overridden by browser
- Ensure JavaScript is enabled

### View App Logs

```bash
# Using Databricks CLI
databricks apps logs your-app-name

# Or view in Databricks UI
# Apps → Your App → Logs tab
```

## 📄 License

Built with React, TypeScript, and Vite for Databricks Apps.

---

