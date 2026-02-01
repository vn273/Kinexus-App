# Kinexus - Network Relationship Manager

A lightweight, fast personal CRM for managing professional and personal contacts with category-based organization, smart search, and LinkedIn CSV import.

## 🚀 Features

### Core Functionality
- **Contact Management**: Full CRUD operations for contacts
- **Category Filtering**: Organize contacts into multiple categories (Professional, Personal, UCLA, High School, Entrepreneur, Family, Business Contacts, Tech Industry)
- **Real-time Search**: Search across names, companies, roles, and tags
- **Quick Add**: Fast contact entry with keyboard shortcut (Cmd/Ctrl + K)
- **Last Contact Tracking**: Color-coded indicators showing when you last reached out
  - 🟢 Green: < 30 days
  - 🟡 Yellow: 30-90 days
  - 🔴 Red: > 90 days
  - ⚪ Gray: Never contacted

### Additional Features
- **CSV Import/Export**: Import LinkedIn connections and export your contacts
- **Strategic Value Rating**: Rate contacts 1-5 for prioritization
- **Tags System**: Add custom tags for flexible organization
- **Guest Mode**: Try the app with sample data without signing up
- **Firebase Authentication**: Secure email/password authentication
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **UI Framework**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Backend**: Firebase (Firestore + Auth)
- **Routing**: React Router

## 📁 Project Structure

```
src/
├── components/
│   ├── ContactCard.jsx       # Individual contact card display
│   ├── ContactForm.jsx       # Add/edit contact form
│   ├── QuickAddModal.jsx     # Quick add modal (Cmd/Ctrl + K)
│   ├── SearchBar.jsx         # Search input component
│   └── Sidebar.jsx           # Category filter sidebar
├── contexts/
│   ├── AuthContext.jsx       # Authentication state management
│   └── ContactContext.jsx    # Contact data management
├── pages/
│   ├── Dashboard.jsx         # Main application view
│   └── Login.jsx             # Authentication page
├── services/
│   ├── firebase.js           # Firebase configuration
│   ├── contactService.js     # Firestore CRUD operations
│   └── csvService.js         # CSV import/export logic
├── utils/
│   └── dateHelpers.js        # Date formatting and calculations
├── App.jsx                   # Main app component with routing
└── main.jsx                  # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account (for production use)

### Installation

1. **Clone the repository**
   ```bash
   cd /path/to/your/project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase** (optional for guest mode)
   
   Edit `src/services/firebase.js` and replace the placeholder values with your Firebase project credentials:
   
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

   To get these credentials:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Go to Project Settings > General
   - Scroll to "Your apps" and click the web icon (</>)
   - Register your app and copy the config values

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:5173](http://localhost:5173) in your browser

## 🎯 Usage

### Getting Started

1. **Login**: Sign up with email/password or click "Continue as Guest" to try with sample data
2. **Browse Contacts**: View your contacts in a card grid layout
3. **Filter by Category**: Click categories in the sidebar to filter
4. **Search**: Use the search bar to find contacts by name, company, role, or tags
5. **Quick Add**: Press `Cmd/Ctrl + K` anywhere to quickly add a new contact

### Managing Contacts

- **Add Contact**: Click "+ Add Contact" or press `Cmd/Ctrl + K`
- **View Details**: Click any contact card to see full details
- **Edit Contact**: Click the edit icon in the contact detail view
- **Delete Contact**: Click the trash icon in the contact detail view
- **Update Last Contact**: Edit a contact and set the "Last Contact Date"

### CSV Operations

- **Import**: Click "Import CSV" and select a LinkedIn connections export
- **Export**: Click "Export" to download your contacts as CSV

## 🔥 Firebase Setup (Production)

### 1. Create Firestore Database

1. Go to Firebase Console > Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a Cloud Firestore location
5. Click "Enable"

### 2. Set Up Security Rules

In Firestore > Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contacts/{contact} {
      allow read, write: if request.auth != null && 
                          resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

### 3. Enable Authentication

1. Go to Firebase Console > Authentication
2. Click "Get started"
3. Enable "Email/Password" sign-in method

## 📊 Data Model

```typescript
Contact {
  id: string                    // Auto-generated
  userId: string                // Firebase Auth UID
  firstName: string             // Required
  lastName: string              // Required
  company: string               // Optional
  role: string                  // Optional
  categories: string[]          // Array of selected categories
  tags: string[]                // Array of custom tags
  email: string                 // Optional
  phone: string                 // Optional
  linkedInUrl: string           // Optional
  notes: string                 // Optional
  strategicValue: number        // 1-5 rating
  lastContactDate: timestamp    // Nullable
  createdAt: timestamp          // Auto-generated
  updatedAt: timestamp          // Auto-updated
}
```

## 🎨 Customization

### Adding Categories

Edit the `CATEGORIES` array in:
- `src/components/ContactForm.jsx`
- `src/components/Sidebar.jsx`

```javascript
const CATEGORIES = [
  'Professional',
  'Personal',
  'Your Custom Category',
  // Add more...
];
```

### Changing Color Theme

Modify Tailwind colors in `tailwind.config.js` or update component class names.

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Deploy to Vercel/Netlify

Simply connect your Git repository and these platforms will auto-detect the Vite configuration.

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### Firebase Connection Issues

- Ensure Firebase credentials are correctly configured in `src/services/firebase.js`
- Check that Firestore database is created and enabled
- Verify authentication method is enabled in Firebase Console

### Build Errors

- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your own use!

## 📄 License

MIT License with Commercial Restriction

Copyright (c) 2026 Vishnu Nair

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software for personal, non-commercial use only.

Commercial use, including but not limited to selling, licensing, or offering 
this software as a service, requires explicit written permission from the 
copyright holder.

For commercial licensing inquiries: [your-email@example.com]

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

## 🎯 Roadmap

Future enhancements:
- [ ] Email integration for tracking communications
- [ ] Calendar integration for scheduling follow-ups
- [ ] Advanced analytics and insights
- [ ] Mobile app (React Native)
- [ ] Bulk operations
- [ ] Contact deduplication
- [ ] Import from other sources (Gmail, Outlook, etc.)

## 💡 Tips

- Use the **Quick Add** (Cmd/Ctrl + K) for fastest entry
- Regularly update **Last Contact Date** to track relationships
- Use **Strategic Value** to prioritize important contacts
- Export regularly as backup
- Leverage **tags** for flexible categorization beyond fixed categories

---

Built with ❤️ for personal networking management

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
