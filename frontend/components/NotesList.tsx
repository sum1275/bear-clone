interface Note {
  id: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface NotesListProps {
  notes: Note[];
  selectedNoteId: number | null;
  searchQuery: string;
  currentPage: number;
  pages: number;
  loading: boolean;
  error: string | null;
  onSearchChange: (query: string) => void;
  onSelectNote: (noteId: number) => void;
  onCreateNew: () => void;
  onPageChange: (page: number) => void;
}

export default function NotesList({
  notes,
  selectedNoteId,
  searchQuery,
  currentPage,
  pages,
  loading,
  error,
  onSearchChange,
  onSelectNote,
  onCreateNew,
  onPageChange,
}: NotesListProps) {
  return (
    <div
      style={{
        flex: 1,
        border: '1px solid #ddd',
        padding: '15px',
        overflowY: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
        Notes ({notes.length})
      </h2>

      <input
        type="text"
        placeholder="Search Notes ..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '15px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          outline: 'none',
        }}
      />

      <button
        onClick={onCreateNew}
        style={{
          width: '100%',
          marginBottom: '15px',
          padding: '10px 12px',
          color: 'red',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        + New Note
      </button>

      {loading && <p style={{ color: '#666', textAlign: 'center' }}>Loading Notes ...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {notes.map((note) => (
          <li
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            style={{
              padding: '12px',
              marginBottom: '10px',
              border: selectedNoteId === note.id ? '2px solid #007bff' : '1px solid #ddd',
              cursor: 'pointer',
              backgroundColor: selectedNoteId === note.id ? '#e7f3ff' : '#fafafa',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <strong style={{ color: '#333', display: 'block' }}>
              {note.title}
            </strong>
            <small style={{ color: '#666' }}>
              {new Date(note.updated_at).toLocaleDateString()}
            </small>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '15px',
          paddingTop: '15px',
          borderTop: '1px solid #ddd',
        }}
      >
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1 || loading}
          style={{
            padding: '8px 12px',
            backgroundColor: currentPage === 1 ? '#ddd' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          ← Previous
        </button>
        <span style={{ color: '#666', fontSize: '14px' }}>
          page {currentPage} of {pages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, pages))}
          disabled={currentPage === pages || pages === 0 || loading}
          style={{
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentPage === pages ? '#ddd' : '#007bff',
            cursor: currentPage === pages ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            padding: '8px 12px',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
