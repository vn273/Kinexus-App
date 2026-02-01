# Firebase Setup Instructions

## ⚠️ IMPORTANT: Missing or Insufficient Permissions Error

If you're seeing the error "Missing or insufficient permissions" when importing CSV or adding contacts, you need to set up Firestore security rules.

## Steps to Fix Permissions Error:

### 1. Go to Firebase Console
- Open https://console.firebase.google.com/
- Select your project: **networking-planner**

### 2. Set Up Firestore Database (if not done already)
- Click **Build** → **Firestore Database**
- If you see "Get started", click it
- Choose **Start in test mode** (allows all reads/writes for 30 days)
- Select a Cloud Firestore location (closest to you)
- Click **Enable**

### 3. Configure Security Rules

Click on the **Rules** tab and replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Contacts collection - users can only access their own contacts
    match /contacts/{contactId} {
      allow read, write: if request.auth != null && 
                           request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
    }
    
    // Networking leads collection - users can only access their own leads
    match /networkingLeads/{leadId} {
      allow read, write: if request.auth != null && 
                           request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish** to save the rules.

### 4. Enable Email/Password Authentication

- Click **Build** → **Authentication**
- Click **Get started** (if not already done)
- Click **Email/Password** under "Sign-in method"
- Toggle **Enable** to ON
- Click **Save**

## Test Your Setup

1. **Restart your dev server** (Ctrl+C, then `npm run dev`)
2. **Log in** to your app (not guest mode)
3. Try adding a contact
4. Try importing a CSV

If you still see permission errors, make sure you're **logged in** (not in guest mode). Guest mode cannot write to Firestore.

## Security Rules Explanation

The rules above ensure:
- ✅ Users can only read/write their own data (userId matches auth.uid)
- ✅ Guest users cannot write to Firestore (must be authenticated)
- ✅ No unauthorized access to other users' data
- ✅ All operations require authentication

## Production Deployment

For production, consider more restrictive rules:
- Add data validation (required fields, data types)
- Add rate limiting
- Add more specific field-level security
- Switch from test mode to production mode with proper rules

## Need Help?

Check the Firebase Console error messages for specific permission issues.
