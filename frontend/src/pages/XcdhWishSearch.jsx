import { useMemo, useState } from 'react';
import { searchXcdhMessages } from '../utils/xcdhWishes';
import './XcdhWishSearch.css';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function XcdhWishSearch({ messages, onSelect }) {
  const [query, setQuery] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const results = useMemo(() => searchXcdhMessages(messages, query), [messages, query]);
  const hasQuery = query.trim().length > 0;

  const goToWish = (message) => {
    setResultsOpen(false);
    onSelect(message);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (results[0]) goToWish(results[0]);
  };

  return (
    <section
      className="xcdh-wish-search"
      data-interactive="true"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setResultsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setResultsOpen(false);
      }}
    >
      <form className="xcdh-wish-search__form" onSubmit={handleSubmit} role="search">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setResultsOpen(true);
          }}
          onFocus={() => setResultsOpen(true)}
          placeholder="搜索 ID、昵称或星愿"
          aria-label="搜索星愿"
          aria-expanded={resultsOpen && hasQuery}
          aria-controls="xcdh-wish-search-results"
        />
      </form>

      {resultsOpen && hasQuery && (
        <div className="xcdh-wish-search__results" id="xcdh-wish-search-results" role="listbox">
          {results.length > 0 ? results.map((message) => (
            <button
              key={message.id}
              type="button"
              className="xcdh-wish-search__result"
              onClick={() => goToWish(message)}
              role="option"
              aria-label={`前往星愿 ${message.id}，来自 ${message.username}`}
            >
              <span className="xcdh-wish-search__result-main">
                <strong>#{message.id} · {message.username}</strong>
                <small>{message.content}</small>
              </span>
              <span className="xcdh-wish-search__result-action">
                <small>发现 {message.click_count || 0} 次</small>
                <b>前往</b>
              </span>
            </button>
          )) : (
            <p className="xcdh-wish-search__empty">这片星海中暂未找到相关星愿</p>
          )}
        </div>
      )}
    </section>
  );
}

export default XcdhWishSearch;
