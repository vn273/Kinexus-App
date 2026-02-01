import { AlertTriangle, XCircle, User, Building2, Check, X, ExternalLink } from 'lucide-react';
import { formatDuplicateInfo } from '../services/duplicateService';

/**
 * Modal to display duplicate warnings during contact/lead creation
 */
const DuplicateWarningModal = ({
  isOpen,
  onClose,
  duplicateResult,
  entryName,
  onAddAnyway,
  onSkip,
  onViewExisting,
  isBatchMode = false,
  batchStats = null
}) => {
  if (!isOpen) return null;

  const { hasBlockingDuplicates, duplicates } = duplicateResult || {};
  
  // For batch mode
  if (isBatchMode && batchStats) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Duplicate Check Results
                  </h3>
                  <p className="text-sm text-gray-600">
                    Review potential duplicates before importing
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{batchStats.clean}</div>
                  <div className="text-sm text-green-600">Ready to import</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-700">{batchStats.warnings}</div>
                  <div className="text-sm text-yellow-600">Possible duplicates</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-700">{batchStats.blocked}</div>
                  <div className="text-sm text-red-600">Will be skipped</div>
                </div>
              </div>
            </div>

            {/* Blocked entries */}
            {batchStats.blockedEntries && batchStats.blockedEntries.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-200 max-h-48 overflow-y-auto">
                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <XCircle size={16} />
                  Blocked (exact email/LinkedIn match)
                </h4>
                <div className="space-y-2">
                  {batchStats.blockedEntries.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-sm bg-red-50 p-2 rounded flex justify-between">
                      <span className="font-medium">
                        {item.entry.firstName} {item.entry.lastName}
                      </span>
                      <span className="text-red-600">{item.reason}</span>
                    </div>
                  ))}
                  {batchStats.blockedEntries.length > 10 && (
                    <div className="text-sm text-gray-500">
                      ...and {batchStats.blockedEntries.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning entries */}
            {batchStats.warningEntries && batchStats.warningEntries.length > 0 && (
              <div className="px-6 py-4 max-h-48 overflow-y-auto">
                <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Possible duplicates (similar names)
                </h4>
                <div className="space-y-2">
                  {batchStats.warningEntries.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-sm bg-yellow-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {item.entry.firstName} {item.entry.lastName}
                        </span>
                        <span className="text-yellow-600">
                          Similar to: {item.duplicates[0]?.existing?.firstName} {item.duplicates[0]?.existing?.lastName}
                        </span>
                      </div>
                    </div>
                  ))}
                  {batchStats.warningEntries.length > 10 && (
                    <div className="text-sm text-gray-500">
                      ...and {batchStats.warningEntries.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel Import
              </button>
              <button
                onClick={() => onSkip()}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Import {batchStats.clean} Clean Only
              </button>
              {batchStats.warnings > 0 && (
                <button
                  onClick={() => onAddAnyway()}
                  className="px-4 py-2 text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                >
                  Import All ({batchStats.clean + batchStats.warnings})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single entry mode
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className={`px-6 py-4 border-b ${hasBlockingDuplicates ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-3">
              {hasBlockingDuplicates ? (
                <XCircle className="text-red-600" size={24} />
              ) : (
                <AlertTriangle className="text-yellow-600" size={24} />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {hasBlockingDuplicates ? 'Duplicate Entry Blocked' : 'Possible Duplicate Found'}
                </h3>
                <p className="text-sm text-gray-600">
                  {hasBlockingDuplicates 
                    ? `"${entryName}" already exists with the same email or LinkedIn URL.`
                    : `"${entryName}" may already exist in your contacts.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Duplicate list */}
          <div className="px-6 py-4 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Matching entries found:
            </h4>
            <div className="space-y-3">
              {duplicates?.map((dup, idx) => {
                const info = formatDuplicateInfo(dup);
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border ${dup.isBlocking ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{info.name}</div>
                          {info.subtitle && (
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Building2 size={12} />
                              {info.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      {onViewExisting && (
                        <button
                          onClick={() => onViewExisting(dup.existing)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View existing entry"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {info.reasons.map((reason, i) => (
                        <span 
                          key={i}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            dup.isBlocking 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {hasBlockingDuplicates ? (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <XCircle size={16} />
                Cannot add duplicate entry
              </p>
            ) : (
              <>
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Don't Add
                </button>
                <button
                  onClick={onAddAnyway}
                  className="px-4 py-2 text-white bg-yellow-600 rounded-md hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Check size={16} />
                  Add Anyway
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateWarningModal;
