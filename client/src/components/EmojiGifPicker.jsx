import React, { useState } from 'react';
import { Search, Smile, Film, Sparkles, X } from 'lucide-react';

// Curated list of popular animated GIFs for reactions
const POPULAR_GIFS = [
  {
    id: 'g1',
    category: 'Thumbs Up',
    title: 'Thumbs Up Approval',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif'
  },
  {
    id: 'g2',
    category: 'Cheers',
    title: 'Great Job Cheers',
    url: 'https://media.giphy.com/media/GCLlQnV7dXY2KGmpAj/giphy.gif'
  },
  {
    id: 'g3',
    category: 'Dancing',
    title: 'Celebration Dance',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif'
  },
  {
    id: 'g4',
    category: 'Mind Blown',
    title: 'Mind Blown',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif'
  },
  {
    id: 'g5',
    category: 'Laughing',
    title: 'Laughing Out Loud',
    url: 'https://media.giphy.com/media/CoDp6NnSmItoY/giphy.gif'
  },
  {
    id: 'g6',
    category: 'Party',
    title: 'Party Confetti',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif'
  },
  {
    id: 'g7',
    category: 'Love',
    title: 'Heart Eyes Love',
    url: 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif'
  },
  {
    id: 'g8',
    category: 'Yes',
    title: 'Nodding Yes Agree',
    url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif'
  },
  {
    id: 'g9',
    category: 'Clapping',
    title: 'Applause Round of Cheers',
    url: 'https://media.giphy.com/media/nbvFVEldHM4WCyQKb9/giphy.gif'
  },
  {
    id: 'g10',
    category: 'Trending',
    title: 'Let’s Go Rocket',
    url: 'https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif'
  },
  {
    id: 'g11',
    category: 'Shocked',
    title: 'Shocked Cat Wow',
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif'
  },
  {
    id: 'g12',
    category: 'Bye',
    title: 'Wave Hello Goodbye',
    url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif'
  }
];

// Rich Curated Emojis organized by Categories
const EMOJI_CATEGORIES = {
  'Smileys & Emotions': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
    '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧'
  ],
  'Gestures & People': [
    '👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
    '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖',
    '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
    '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁'
  ],
  'Hearts & Vibes': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '✨', '⭐', '🌟', '💫', '⚡', '☄️', '💥', '🔥', '🌈', '☀️'
  ],
  'Tech & Work': [
    '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📱', '📲', '☎️', '📞', '📟',
    '💾', '💿', '📀', '🎥', '🎬', '📽️', '📷', '📸', '📹', '📺',
    '📊', '📈', '📉', '📁', '📂', '📄', '📃', '📑', '📝', '✉️',
    '🚀', '🛸', '🛰️', '💡', '🔦', '🔑', '🗝️', '🔨', '🛠️', '⚙️'
  ]
};

export default function EmojiGifPicker({ onSelectEmoji, onSelectGif, onClose }) {
  const [activeTab, setActiveTab] = useState('emoji'); // 'emoji' | 'gif'
  const [search, setSearch] = useState('');
  const [selectedGifCategory, setSelectedGifCategory] = useState('All');

  // Filter emojis based on search
  const filteredEmojiCategories = Object.entries(EMOJI_CATEGORIES).reduce(
    (acc, [category, emojis]) => {
      const filtered = emojis.filter((e) => !search || e.includes(search));
      if (filtered.length > 0) acc[category] = filtered;
      return acc;
    },
    {}
  );

  // Filter GIFs
  const gifCategories = ['All', 'Thumbs Up', 'Cheers', 'Dancing', 'Mind Blown', 'Laughing', 'Party', 'Love', 'Yes', 'Clapping'];
  const filteredGifs = POPULAR_GIFS.filter((g) => {
    const matchesCategory = selectedGifCategory === 'All' || g.category === selectedGifCategory;
    const matchesSearch = !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '75px',
        right: '16px',
        width: '340px',
        maxHeight: '400px',
        backgroundColor: '#181824',
        border: '1px solid #2e2e42',
        borderRadius: '16px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid #262638',
          backgroundColor: '#14141e'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'emoji' ? '#7059ea' : 'transparent',
              color: activeTab === 'emoji' ? '#ffffff' : '#9ca3af',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Smile size={15} />
            <span>Emojis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gif')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'gif' ? '#7059ea' : 'transparent',
              color: activeTab === 'gif' ? '#ffffff' : '#9ca3af',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Film size={15} />
            <span>GIFs</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Close Picker"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #232332' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} color="#6b7280" style={{ position: 'absolute', left: '10px', top: '8px' }} />
          <input
            type="text"
            placeholder={activeTab === 'emoji' ? 'Search emojis...' : 'Search animated GIFs...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1f1f2e',
              border: '1px solid #2c2c3e',
              borderRadius: '8px',
              padding: '6px 10px 6px 30px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', maxHeight: '300px' }}>
        {activeTab === 'emoji' ? (
          <div>
            {Object.entries(filteredEmojiCategories).map(([category, emojis]) => (
              <div key={category} style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}
                >
                  {category}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '4px'
                  }}
                >
                  {emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '6px 2px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s, background-color 0.1s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2c3e')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* GIF Category Pills */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '8px'
              }}
            >
              {gifCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedGifCategory(cat)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: selectedGifCategory === cat ? '#7059ea' : '#232334',
                    color: selectedGifCategory === cat ? '#fff' : '#9ca3af',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* GIFs Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}
            >
              {filteredGifs.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => onSelectGif(gif.url, gif.title)}
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    aspectRatio: '16/11',
                    backgroundColor: '#1f1f2e',
                    border: '1px solid #2e2e44'
                  }}
                  title={gif.title}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      padding: '3px 6px',
                      fontSize: '10px',
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {gif.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
