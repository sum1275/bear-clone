interface Tag {
  id: number;
  name: string;
  created_at: string;
}

interface TagManagerProps {
  allTags: Tag[];
  selectedTagIds: number[];
  noteTags: Record<number, Tag[]>;
  selectedNoteId: number | null;
  isCreating: boolean;
  showTagInput: boolean;
  newTagName: string;
  onShowTagInputChange: (show: boolean) => void;
  onNewTagNameChange: (name: string) => void;
  onCreateTag: () => void;
  onAddTag: (tagId: number) => void;
  onRemoveTag: (tagId: number) => void;
}

export default function TagManager({
  allTags,
  selectedTagIds,
  noteTags,
  selectedNoteId,
  isCreating,
  showTagInput,
  newTagName,
  onShowTagInputChange,
  onNewTagNameChange,
  onCreateTag,
  onAddTag,
  onRemoveTag,
}: TagManagerProps) {
  const currentTags = isCreating
    ? allTags.filter((t) => selectedTagIds.includes(t.id))
    : selectedNoteId !== null
      ? noteTags[selectedNoteId] || []
      : [];

  return (
    <div
      style={{
        marginBottom: '15px',
        padding: '12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px',
        border: '1px solid #e0e0e0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <strong style={{ color: '#333' }}>Tags</strong>
        <button
          onClick={() => onShowTagInputChange(!showTagInput)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showTagInput ? 'Cancel' : '+ Add Tag'}
        </button>
      </div>

      {/* Display current tags */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '10px',
        }}
      >
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            style={{
              padding: '6px 12px',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              borderRadius: '20px',
              fontSize: '12px',
              border: '1px solid #1976d2',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              userSelect: 'none',
            }}
          >
            #{tag.name}
            <button
              onClick={() => onRemoveTag(tag.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1976d2',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      {/* Tag input form */}
      {showTagInput && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => onNewTagNameChange(e.target.value)}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
          <button
            onClick={onCreateTag}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Create
          </button>
        </div>
      )}

      {/* List available tags to add */}
      {showTagInput && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onAddTag(tag.id)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
