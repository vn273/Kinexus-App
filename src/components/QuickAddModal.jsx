import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ContactForm from './ContactForm';
import DuplicateWarningModal from './DuplicateWarningModal';
import { useContacts } from '../contexts/ContactContext';

const QuickAddModal = ({ isOpen, onClose }) => {
  const { addContact, checkDuplicates } = useContacts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingContact, setPendingContact] = useState(null);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Trigger open from parent component
          document.dispatchEvent(new CustomEvent('openQuickAdd'));
        }
      }
      
      // Close on Escape
      if (e.key === 'Escape' && isOpen && !showDuplicateModal) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showDuplicateModal]);

  const handleSubmit = async (contactData) => {
    try {
      setIsSubmitting(true);
      
      // Check for duplicates first
      const result = checkDuplicates(contactData);
      
      if (result.hasDuplicates) {
        // Store pending contact and show duplicate modal
        setPendingContact(contactData);
        setDuplicateResult(result);
        setShowDuplicateModal(true);
        setIsSubmitting(false);
        return;
      }
      
      // No duplicates, proceed with adding
      await addContact(contactData);
      onClose();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddAnyway = async () => {
    if (!pendingContact) return;
    
    try {
      setIsSubmitting(true);
      await addContact(pendingContact, { skipDuplicateCheck: true });
      setShowDuplicateModal(false);
      setPendingContact(null);
      setDuplicateResult(null);
      onClose();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSkipDuplicate = () => {
    setShowDuplicateModal(false);
    setPendingContact(null);
    setDuplicateResult(null);
  };
  
  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setPendingContact(null);
    setDuplicateResult(null);
  };

  if (!isOpen) return null;
  
  const entryName = pendingContact 
    ? `${pendingContact.firstName || ''} ${pendingContact.lastName || ''}`.trim()
    : '';

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Quick Add Contact</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Press <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">Cmd/Ctrl + K</kbd> to open anytime
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4">
              <ContactForm
                onSubmit={handleSubmit}
                onCancel={onClose}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        duplicateResult={duplicateResult}
        entryName={entryName}
        onAddAnyway={handleAddAnyway}
        onSkip={handleSkipDuplicate}
      />
    </>
  );
};

export default QuickAddModal;
