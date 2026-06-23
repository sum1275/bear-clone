import TagManager from './TagManager';

interface Tag {
  id: number;
  name: string;
  created_at: string;
}

interface EditorPaneProps {
  selectedNoteId: number | null;
  isCreating: boolean;
  title: string;
  content: string;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  mutationLoading: boolean;
  mutationError: string | null;
  allTags: Tag[];
  selectedTagIds: number[];
  noteTags: Record<number, Tag[]>;
  showTagInput: boolean;
  newTagName: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onShowTagInputChange: (show: boolean) => void;
  onNewTagNameChange: (name: string) => void;
  onCreateTag: () => void;
  onAddTag: (tagId: number) => void;
  onRemoveTag: (tagId: number) => void;
}

export default function EditorPane({
  selectedNoteId,
  isCreating,
  title,
  content,
  autoSaveStatus,
  mutationLoading,
  mutationError,
  allTags,
  selectedTagIds,
  noteTags,
  showTagInput,
  newTagName,
  onTitleChange,
  onContentChange,
  onSave,
  onDelete,
  onShowTagInputChange,
  onNewTagNameChange,
  onCreateTag,
  onAddTag,
  onRemoveTag,
}: EditorPaneProps) {
  if (selectedNoteId === null && !isCreating) {
    return (
      <div
        style={{
          flex: 1,
          border: '1px solid #ddd',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
          }}
        >
          <p style={{ fontSize: '16px' }}>Select a note or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        border: '1px solid #ddd',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}
    >
      <input
        type="text"
        placeholder="Note Title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        style={{
          padding: '10px',
          marginBottom: '10px',
          fontSize: '18px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontWeight: 'bold',
          outline: 'none',
        }}
      />

      <p
        style={{
          fontSize: '12px',
          color: autoSaveStatus === 'saving' ? '#ff9800' : '#4caf50',
          opacity: autoSaveStatus === 'idle' ? 0 : 1,
          transition: 'opacity 0.3s ease',
          height: '18px',
          margin: '5px 0',
        }}
      >
        {autoSaveStatus === 'saving' ? '💾 Saving...' : '✅ Saved'}
      </p>

      <textarea
        placeholder="Content (markdown support)"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        style={{
          flex: 1,
          padding: '10px',
          marginBottom: '15px',
          fontFamily: 'monospace',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          resize: 'none',
          outline: 'none',
        }}
      />

      <TagManager
        allTags={allTags}
        selectedTagIds={selectedTagIds}
        noteTags={noteTags}
        selectedNoteId={selectedNoteId}
        isCreating={isCreating}
        showTagInput={showTagInput}
        newTagName={newTagName}
        onShowTagInputChange={onShowTagInputChange}
        onNewTagNameChange={onNewTagNameChange}
        onCreateTag={onCreateTag}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
      />

      {mutationError && (
        <div
          style={{
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
          }}
        >
          Error: {mutationError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', transition: 'opacity 0.2s ease' }}>
        <button
          onClick={onSave}
          disabled={mutationLoading}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: mutationLoading ? '#cccccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: mutationLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {mutationLoading ? 'Saving' : 'Save'}
        </button>

        {selectedNoteId && (
          <button
            onClick={onDelete}
            disabled={mutationLoading}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: mutationLoading ? '#cccccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: mutationLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
