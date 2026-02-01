import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const CONNECTIONS_COLLECTION = 'connections';

/**
 * Connection types between contacts
 */
export const CONNECTION_TYPES = {
  INTRODUCED: 'introduced',
  MUTUAL_FRIENDS: 'mutual_friends',
  COLLEAGUES: 'colleagues',
  FAMILY: 'family',
  CLASSMATES: 'classmates'
};

/**
 * Get all connections for a user
 */
export const getConnections = async (userId) => {
  try {
    const q = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }));
  } catch (error) {
    console.error('Error getting connections:', error);
    throw error;
  }
};

/**
 * Add a new connection between two contacts
 */
export const addConnection = async (userId, connectionData) => {
  try {
    // Ensure we don't create duplicate connections
    const existing = await findConnection(userId, connectionData.contact1Id, connectionData.contact2Id);
    if (existing) {
      console.log('Connection already exists');
      return existing.id;
    }

    const docRef = await addDoc(collection(db, CONNECTIONS_COLLECTION), {
      ...connectionData,
      userId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding connection:', error);
    throw error;
  }
};

/**
 * Find a connection between two contacts (in either direction)
 */
export const findConnection = async (userId, contact1Id, contact2Id) => {
  try {
    const connections = await getConnections(userId);
    return connections.find(conn => 
      (conn.contact1Id === contact1Id && conn.contact2Id === contact2Id) ||
      (conn.contact1Id === contact2Id && conn.contact2Id === contact1Id)
    );
  } catch (error) {
    console.error('Error finding connection:', error);
    return null;
  }
};

/**
 * Update a connection
 */
export const updateConnection = async (connectionId, data) => {
  try {
    const connectionRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
    await updateDoc(connectionRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    throw error;
  }
};

/**
 * Delete a connection
 */
export const deleteConnection = async (connectionId) => {
  try {
    await deleteDoc(doc(db, CONNECTIONS_COLLECTION, connectionId));
  } catch (error) {
    console.error('Error deleting connection:', error);
    throw error;
  }
};

/**
 * Get all connections involving a specific contact
 */
export const getConnectionsForContact = async (userId, contactId) => {
  try {
    const allConnections = await getConnections(userId);
    return allConnections.filter(conn => 
      conn.contact1Id === contactId || conn.contact2Id === contactId
    );
  } catch (error) {
    console.error('Error getting connections for contact:', error);
    return [];
  }
};

/**
 * Create an introduction connection (A introduced B)
 */
export const recordIntroduction = async (userId, introducerId, introducedId, notes = '') => {
  return addConnection(userId, {
    contact1Id: introducerId,
    contact2Id: introducedId,
    connectionType: CONNECTION_TYPES.INTRODUCED,
    strength: 3,
    notes: notes || `Introduced on ${new Date().toLocaleDateString()}`
  });
};

/**
 * Create a mutual connection (A and B know each other)
 */
export const recordMutualConnection = async (userId, contact1Id, contact2Id, type = CONNECTION_TYPES.MUTUAL_FRIENDS, strength = 3, notes = '') => {
  return addConnection(userId, {
    contact1Id,
    contact2Id,
    connectionType: type,
    strength,
    notes
  });
};
