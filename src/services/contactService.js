import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const CONTACTS_COLLECTION = 'contacts';

// Get all contacts for a user
export const getContacts = async (userId) => {
  try {
    const q = query(
      collection(db, CONTACTS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const contacts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to JavaScript Date objects
        lastContactDate: data.lastContactDate?.toDate ? data.lastContactDate.toDate() : data.lastContactDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      };
    });
    // Sort client-side to avoid needing Firestore index
    return contacts.sort((a, b) => {
      const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
};

// Add a new contact
export const addContact = async (userId, contactData) => {
  try {
    const docRef = await addDoc(collection(db, CONTACTS_COLLECTION), {
      ...contactData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding contact:', error);
    throw error;
  }
};

// Update a contact
export const updateContact = async (contactId, contactData) => {
  try {
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    await updateDoc(contactRef, {
      ...contactData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
};

// Delete a contact
export const deleteContact = async (contactId) => {
  try {
    await deleteDoc(doc(db, CONTACTS_COLLECTION, contactId));
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
};

// Get contacts by category
export const getContactsByCategory = async (userId, category) => {
  try {
    const q = query(
      collection(db, CONTACTS_COLLECTION),
      where('userId', '==', userId),
      where('categories', 'array-contains', category)
    );
    const querySnapshot = await getDocs(q);
    const contacts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort client-side
    return contacts.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting contacts by category:', error);
    throw error;
  }
};
