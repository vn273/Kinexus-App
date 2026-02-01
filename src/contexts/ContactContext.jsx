import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as contactService from '../services/contactService';
import { findDuplicates, findBatchDuplicates } from '../services/duplicateService';

const ContactContext = createContext({});

export const useContacts = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error('useContacts must be used within ContactProvider');
  }
  return context;
};

// Sample data for development
const SAMPLE_CONTACTS = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Tech Corp',
    role: 'Software Engineer',
    categories: ['Professional', 'Tech Industry'],
    tags: ['React', 'JavaScript'],
    email: 'john.doe@example.com',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    phone: '+1234567890',
    notes: 'Met at tech conference 2024',
    strategicValue: 4,
    lastContactDate: new Date('2024-12-15'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-12-15')
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    company: 'UCLA',
    role: 'Professor',
    categories: ['UCLA', 'Professional'],
    tags: ['Education', 'Mentor'],
    email: 'jane.smith@ucla.edu',
    linkedInUrl: 'https://linkedin.com/in/janesmith',
    notes: 'Former professor, great mentor',
    strategicValue: 5,
    lastContactDate: new Date('2025-01-20'),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2025-01-20')
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Johnson',
    company: 'Startup Inc',
    role: 'CEO',
    categories: ['Entrepreneur', 'Business Contacts'],
    tags: ['Startups', 'Funding'],
    email: 'bob@startup.com',
    linkedInUrl: 'https://linkedin.com/in/bobjohnson',
    phone: '+1987654321',
    notes: 'Interested in collaboration opportunities',
    strategicValue: 5,
    lastContactDate: new Date('2024-10-05'),
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-10-05')
  },
  {
    id: '4',
    firstName: 'Sarah',
    lastName: 'Williams',
    company: 'Design Studio',
    role: 'Creative Director',
    categories: ['Professional', 'Personal'],
    tags: ['Design', 'Creative'],
    email: 'sarah@design.com',
    notes: 'College friend, now running design agency',
    strategicValue: 3,
    lastContactDate: null,
    createdAt: new Date('2024-04-20'),
    updatedAt: new Date('2024-04-20')
  }
];

export const ContactProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState(SAMPLE_CONTACTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load contacts from Firestore
  const loadContacts = async () => {
    if (!currentUser) {
      setContacts(SAMPLE_CONTACTS);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedContacts = await contactService.getContacts(currentUser.uid);
      
      // Use fetched data even if empty (user might have no contacts yet)
      setContacts(fetchedContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
      console.error('Full error:', JSON.stringify(err, null, 2));
      setError(err.message);
      // Start with empty array for authenticated users
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new contact
  const addContact = async (contactData, options = {}) => {
    const { skipDuplicateCheck = false, linkedLeadId = null } = options;
    
    try {
      setError(null);
      
      // Add linkedLeadId if provided (for bidirectional linking)
      const dataWithLink = linkedLeadId 
        ? { ...contactData, linkedLeadId }
        : contactData;
      
      if (!currentUser) {
        // Add to local state only (demo mode)
        const newContact = {
          ...dataWithLink,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setContacts(prev => [newContact, ...prev]);
        return newContact.id;
      }

      const contactId = await contactService.addContact(currentUser.uid, dataWithLink);
      await loadContacts();
      return contactId;
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err.message);
      throw err;
    }
  };
  
  // Check for duplicates before adding
  const checkDuplicates = useCallback((contactData) => {
    return findDuplicates(contactData, contacts);
  }, [contacts]);
  
  // Check batch duplicates for CSV import
  const checkBatchDuplicates = useCallback((entries) => {
    return findBatchDuplicates(entries, contacts);
  }, [contacts]);

  // Update a contact
  const updateContact = async (contactId, contactData) => {
    try {
      setError(null);
      
      if (!currentUser) {
        // Update local state only (demo mode)
        setContacts(prev =>
          prev.map(contact =>
            contact.id === contactId
              ? { ...contact, ...contactData, updatedAt: new Date() }
              : contact
          )
        );
        return;
      }

      await contactService.updateContact(contactId, contactData);
      await loadContacts();
    } catch (err) {
      console.error('Error updating contact:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete a contact
  const deleteContact = async (contactId) => {
    try {
      setError(null);
      
      if (!currentUser) {
        // Delete from local state only (demo mode)
        setContacts(prev => prev.filter(contact => contact.id !== contactId));
        return;
      }

      await contactService.deleteContact(contactId);
      await loadContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError(err.message);
      throw err;
    }
  };

  // Load contacts when user changes
  useEffect(() => {
    if (currentUser) {
      loadContacts();
    } else {
      // Use sample data when not logged in
      setContacts(SAMPLE_CONTACTS);
    }
  }, [currentUser]);

  const value = {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    refreshContacts: loadContacts,
    checkDuplicates,
    checkBatchDuplicates
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
};
