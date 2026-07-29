import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './XcdhPage.css';
import './XcdhCinematic.css';
import XcdhFlagship3D from './XcdhFlagship3D';
import XcdhWishSearch from './XcdhWishSearch';
import { getDeduplicated } from '../api';
import {
  clampUniverseOffset,
  getViewportFocusCorrection,
  isRectFullyVisible,
  isRectVisible,
  selectOffscreenMessage,
} from '../utils/xcdhDiscovery';
import { formatXcdhCreatedAt } from '../utils/xcdhTime';
import { getWishDiscoveryTheme } from '../utils/xcdhWishes';


const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const UNIVERSE_OVERSCAN = 720;
const FOCUS_SAFE_MARGIN = 200;
const POPUP_HEIGHT = 190;
const POPUP_WIDTH = 410;


const clamp = (value, min, max) => Math.min(Math.max(value, min), max);


const seededValue = (index, salt = 0) => {
  const value = Math.sin((index + 1) * 9283.31 + salt * 77.17) * 43758.5453;
  return value - Math.floor(value);
};


const createBackgroundStars = () => Array.from({ length: 260 }, (_, index) => ({
  id: `background-star-${index}`,
  x: seededValue(index, 1) * WORLD_WIDTH,
  y: seededValue(index, 2) * WORLD_HEIGHT,
  depth: -320 + seededValue(index, 8) * 520,
  size: 0.6 + seededValue(index, 3) * 2.8,
  opacity: 0.22 + seededValue(index, 4) * 0.75,
  duration: 2.2 + seededValue(index, 5) * 5.5,
  delay: seededValue(index, 6) * -7,
  twinkles: index % 3 === 0,
  color: seededValue(index, 7) > 0.88
    ? '#fef3c7'
    : seededValue(index, 7) > 0.68 ? '#bfdbfe' : '#ffffff',
}));


const createMeteors = () => Array.from({ length: 9 }, (_, index) => {
  const angle = 18 + seededValue(index, 16) * 17;
  const distance = 520 + seededValue(index, 17) * 420;
  const radians = angle * (Math.PI / 180);
  return {
    id: `meteor-${index}`,
    x: 80 + seededValue(index, 11) * (WORLD_WIDTH - 900),
    y: 40 + seededValue(index, 12) * (WORLD_HEIGHT - 720),
    length: 120 + seededValue(index, 13) * 180,
    duration: 7 + seededValue(index, 14) * 10,
    delay: seededValue(index, 15) * -24,
    angle,
    dx: Math.cos(radians) * distance,
    dy: Math.sin(radians) * distance,
    depth: -80 + seededValue(index, 18) * 220,
  };
});


function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}


function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m21 3-7.7 18-3.9-8.4L1 8.7 21 3Z" />
      <path d="m9.4 12.6 4.2-4.2" />
    </svg>
  );
}


function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 14.2 8.8 21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z" />
      <path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7L19 2Z" />
    </svg>
  );
}


function StarShape({ message }) {
  const variant = seededValue(Number(message.id) || 1, 21);
  const discoveryTheme = getWishDiscoveryTheme(message.click_count);
  const palettes = {
    new: variant > 0.58
      ? { fill: '#dbeafe', glow: '#60a5fa' }
      : { fill: '#ffffff', glow: '#38bdf8' },
    glowing: { fill: '#ede9fe', glow: '#a78bfa' },
    radiant: { fill: '#fef3c7', glow: '#f59e0b' },
    legendary: { fill: '#ffe4e6', glow: '#fb7185' },
  };
  const { fill, glow } = palettes[discoveryTheme];
  const size = 21 + seededValue(Number(message.id) || 1, 22) * 12;
  const rotation = seededValue(Number(message.id) || 1, 23) * 42;
  const duration = 2.3 + seededValue(Number(message.id) || 1, 24) * 2.8;

  return (
    <span
      className="xcdh-wish-star__visual"
      data-discovery-theme={discoveryTheme}
      style={{
        '--star-fill': fill,
        '--star-glow': glow,
        '--star-size': `${size}px`,
        '--star-rotation': `${rotation}deg`,
        '--star-duration': `${duration}s`,
      }}
    >
      <span className="xcdh-wish-star__halo" />
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 3 60.6 36.1 95 47.3 67.2 67.5 77.8 100 50 79.9 22.2 100 32.8 67.5 5 47.3 39.4 36.1 50 3Z" />
      </svg>
      <span className="xcdh-wish-star__core" />
    </span>
  );
}


function SpaceShip() {
  return (
    <div className="xcdh-spaceship" aria-hidden="true">
      <div className="xcdh-spaceship__depth">
        <div className="xcdh-spaceship__wake" />
        <XcdhFlagship3D />
      </div>
    </div>
  );
}


function WishPopup({ message, position, onClose }) {
  if (!message || !position) return null;
  const createdAt = formatXcdhCreatedAt(message.created_at);

  return (
    <aside
      className={`xcdh-wish-popup xcdh-wish-popup--${position.placement}`}
      style={{ left: position.left, top: position.top, width: position.width }}
      data-interactive="true"
      aria-live="polite"
    >
      <button className="xcdh-icon-button xcdh-wish-popup__close" onClick={onClose} aria-label="关闭星愿">
        ×
      </button>
      <div className="xcdh-wish-popup__eyebrow">
        <span className="xcdh-wish-popup__dot" />
        来自 {message.username} 的星愿
      </div>
      <p>{message.content}</p>
      <div className="xcdh-wish-popup__meta">
        <span>星愿 #{message.id}</span>
        <span>发现 {message.click_count || 0} 次</span>
        {createdAt && (
          <span className="xcdh-wish-popup__time">投递 {createdAt}</span>
        )}
      </div>
    </aside>
  );
}


function WishComposer({ open, onOpen, onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const response = await fetch('/api/xcdh/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), content: content.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || '投递星愿失败');
      }
      const message = await response.json();
      setUsername('');
      setContent('');
      setFeedback('星愿已进入宇宙，正在带你前往它的位置…');
      onCreated(message);
    } catch (error) {
      setFeedback(error.message || '投递失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="xcdh-composer" data-interactive="true">
      {!open ? (
        <button className="xcdh-composer__launcher" onClick={onOpen} aria-label="投递星愿">
          <PlusIcon />
          <span>投递星愿</span>
        </button>
      ) : (
        <section className="xcdh-composer__panel">
          <div className="xcdh-composer__glow" />
          <div className="xcdh-composer__header">
            <div className="xcdh-composer__title"><SparkleIcon />许下你的星愿</div>
            <button className="xcdh-icon-button" onClick={onClose} aria-label="收起星愿表单">×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="xcdh-composer__fields">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="你的昵称"
                maxLength={20}
                aria-label="你的昵称"
              />
              <input
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="写下你的心愿或留言…"
                maxLength={100}
                aria-label="星愿内容"
              />
            </div>
            <button
              className="xcdh-composer__submit"
              type="submit"
              disabled={!username.trim() || !content.trim() || submitting}
            >
              {submitting ? <span className="xcdh-spinner" /> : <SendIcon />}
              {submitting ? '投递到星海中…' : '投递到星海中'}
            </button>
          </form>
          <p className={`xcdh-composer__feedback ${feedback.includes('失败') ? 'is-error' : ''}`}>
            {feedback || '你的留言将化作星辰，永远闪烁在这片宇宙中'}
          </p>
        </section>
      )}
    </div>
  );
}


function XcdhPage() {
  const viewportRef = useRef(null);
  const universeRef = useRef(null);
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const dragFrameRef = useRef(null);
  const focusTimerRef = useRef(null);
  const pendingOffsetRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const activeMessageIdRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [activeMessage, setActiveMessage] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const backgroundStars = useMemo(createBackgroundStars, []);
  const meteors = useMemo(createMeteors, []);

  const closePopup = useCallback(() => {
    activeMessageIdRef.current = null;
    setActiveMessage(null);
    setPopupPosition(null);
  }, []);

  const recordMessageDiscovery = useCallback(async (message) => {
    try {
      const response = await fetch(`/api/xcdh/messages/${message.id}/click`, { method: 'POST' });
      if (!response.ok) return;
      const updated = await response.json();
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (activeMessageIdRef.current === updated.id) {
        setActiveMessage(updated);
      }
    } catch {
      // 点击统计失败不影响星愿查看。
    }
  }, []);

  const updateOffset = useCallback((nextOffset) => {
    const viewport = viewportRef.current;
    if (!viewport) return nextOffset;
    const clamped = clampUniverseOffset(nextOffset, {
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      overscan: UNIVERSE_OVERSCAN,
    });
    offsetRef.current = clamped;
    if (universeRef.current) {
      universeRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
    }
    return clamped;
  }, []);

  const centerUniverse = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    updateOffset({
      x: (viewport.clientWidth - WORLD_WIDTH) / 2,
      y: (viewport.clientHeight - WORLD_HEIGHT) / 2,
    });
    closePopup();
  }, [closePopup, updateOffset]);

  const focusMessage = useCallback((message, countDiscovery = false) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    closePopup();
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
    }
    const worldX = (message.x / 100) * WORLD_WIDTH;
    const worldY = (message.y / 100) * WORLD_HEIGHT;
    updateOffset({
      x: viewport.clientWidth / 2 - worldX,
      y: viewport.clientHeight / 2 - worldY,
    });
    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null;
      const width = Math.min(POPUP_WIDTH, window.innerWidth - 32);
      const halfWidth = width / 2;
      const starElement = viewport.querySelector(`[data-message-id="${message.id}"]`);
      if (!starElement) return;
      const viewportRect = viewport.getBoundingClientRect();
      let starRect = starElement.getBoundingClientRect();
      const correction = getViewportFocusCorrection(starRect, viewportRect, FOCUS_SAFE_MARGIN);
      if (correction.x !== 0 || correction.y !== 0) {
        updateOffset({
          x: offsetRef.current.x + correction.x,
          y: offsetRef.current.y + correction.y,
        });
        starRect = starElement.getBoundingClientRect();
      }
      if (!isRectFullyVisible(starRect, viewportRect)) return;
      const starLeft = starRect.left + starRect.width / 2;
      const starTop = starRect.top + starRect.height / 2;
      const placement = viewportRect.bottom - starTop >= POPUP_HEIGHT + 110 ? 'below' : 'above';
      activeMessageIdRef.current = message.id;
      setActiveMessage(message);
      setPopupPosition({
        left: clamp(
          starLeft,
          viewportRect.left + 16 + halfWidth,
          viewportRect.right - 16 - halfWidth,
        ),
        top: placement === 'below'
          ? clamp(
            starTop + 28,
            viewportRect.top + 110,
            viewportRect.bottom - POPUP_HEIGHT - 90,
          )
          : Math.max(viewportRect.top + 86, starTop - POPUP_HEIGHT - 24),
        width,
        placement,
      });
      if (countDiscovery) {
        void recordMessageDiscovery(message);
      }
    }, 360);
  }, [closePopup, recordMessageDiscovery, updateOffset]);

  const discoverNewWish = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || messages.length === 0) return;
    const viewportRect = viewport.getBoundingClientRect();
    const visibleMessageIds = new Set(
      Array.from(viewport.querySelectorAll('[data-message-id]'))
        .filter((element) => isRectVisible(element.getBoundingClientRect(), viewportRect))
        .map((element) => element.dataset.messageId),
    );
    const target = selectOffscreenMessage(
      messages,
      visibleMessageIds,
      activeMessageIdRef.current,
    );
    if (target) focusMessage(target, true);
  }, [focusMessage, messages]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = '黄霄雲的星辰大海';
    centerUniverse();
    const handleResize = () => {
      updateOffset(offsetRef.current);
      closePopup();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      document.title = previousTitle;
      window.removeEventListener('resize', handleResize);
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, [centerUniverse, closePopup, updateOffset]);

  useEffect(() => {
    let canceled = false;
    getDeduplicated('/xcdh/messages', {
      hideLoading: true,
      hideErrorMessage: true,
    })
      .then((response) => {
        const data = response.data;
        if (!canceled) setMessages(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!canceled) setLoadError(error.message || '星愿加载失败');
      });
    return () => { canceled = true; };
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('[data-interactive="true"]')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: offsetRef.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    closePopup();
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    pendingOffsetRef.current = {
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY,
    };
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      if (!pendingOffsetRef.current) return;
      updateOffset(pendingOffsetRef.current);
      pendingOffsetRef.current = null;
    });
  };

  const finishDragging = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    if (pendingOffsetRef.current) {
      updateOffset(pendingOffsetRef.current);
      pendingOffsetRef.current = null;
    }
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const openMessage = (message, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(POPUP_WIDTH, window.innerWidth - 32);
    const halfWidth = width / 2;
    const left = clamp(rect.left + rect.width / 2, 16 + halfWidth, window.innerWidth - 16 - halfWidth);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow >= POPUP_HEIGHT + 100 ? 'below' : 'above';
    const top = placement === 'below'
      ? rect.bottom + 14
      : Math.max(86, rect.top - POPUP_HEIGHT - 14);
    activeMessageIdRef.current = message.id;
    setActiveMessage(message);
    setPopupPosition({ left, top, width, placement });
    void recordMessageDiscovery(message);
  };

  const handleCreated = (message) => {
    setMessages((current) => [...current, message]);
    setComposerOpen(false);
    focusMessage(message);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.volume = 0.12;
      try {
        await audio.play();
        setMusicPlaying(true);
      } catch {
        setMusicPlaying(false);
      }
    } else {
      audio.pause();
      setMusicPlaying(false);
    }
  };

  const totalDiscoveries = messages.reduce((total, message) => total + (message.click_count || 0), 0);

  return (
    <main className="xcdh-page">
      <audio ref={audioRef} src="/seastartpiano.mp3" loop preload="metadata" />

      <header className="xcdh-title">
        <div className="xcdh-title__aurora" />
        <h1>黄霄雲的星辰大海</h1>
        <div className="xcdh-title__line" />
        <p>循着黄霄雲的歌声，奔赴更辽阔的星辰大海</p>
      </header>

      <div className="xcdh-toolbar" data-interactive="true">
        <div className="xcdh-toolbar__stats">
          <strong>{messages.length}</strong> 颗星愿
          <span>，</span>
          魔星拜访 <strong>{totalDiscoveries}</strong> 次
        </div>
        <button onClick={discoverNewWish}>寻找新的星愿</button>
        <button onClick={toggleMusic} aria-label={musicPlaying ? '暂停背景音乐' : '播放背景音乐'}>
          {musicPlaying ? '♫ 音乐开启' : '♪ 播放音乐'}
        </button>
      </div>

      <XcdhWishSearch
        messages={messages}
        onSelect={(message) => focusMessage(message, true)}
      />

      <div
        ref={viewportRef}
        className={`xcdh-viewport ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
      >
        <div
          ref={universeRef}
          className="xcdh-universe"
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
          }}
        >
          <div className="xcdh-space-background" aria-hidden="true">
            <div className="xcdh-space-background__content">
              <div className="xcdh-deep-space" />
              <div className="xcdh-nebula xcdh-nebula--one" />
              <div className="xcdh-nebula xcdh-nebula--two" />
              <div className="xcdh-nebula xcdh-nebula--three" />
              <div className="xcdh-cosmic-dust xcdh-cosmic-dust--one" />
              <div className="xcdh-cosmic-dust xcdh-cosmic-dust--two" />
              <div className="xcdh-volume-light" />
              <div className="xcdh-galaxy" />
              <div className="xcdh-planet xcdh-planet--blue" />
              <div className="xcdh-planet xcdh-planet--ringed"><span /></div>
              <div className="xcdh-moon" />

              {backgroundStars.map((star) => (
                <i
                  key={star.id}
                  className={`xcdh-background-star ${star.twinkles ? 'is-twinkling' : ''}`}
                  style={{
                    left: star.x,
                    top: star.y,
                    width: star.size,
                    height: star.size,
                    background: star.color,
                    '--star-opacity': star.opacity.toFixed(3),
                    '--star-dim-opacity': Math.max(0.12, star.opacity * 0.55).toFixed(3),
                    '--twinkle-duration': `${star.duration}s`,
                    '--twinkle-delay': `${star.delay}s`,
                    '--star-depth': `${star.depth}px`,
                  }}
                />
              ))}

              {meteors.map((meteor) => (
                <i
                  key={meteor.id}
                  className="xcdh-meteor"
                  style={{
                    left: meteor.x,
                    top: meteor.y,
                    width: meteor.length,
                    '--meteor-duration': `${meteor.duration}s`,
                    '--meteor-delay': `${meteor.delay}s`,
                    '--meteor-angle': `${meteor.angle}deg`,
                    '--meteor-dx': `${meteor.dx}px`,
                    '--meteor-dy': `${meteor.dy}px`,
                    '--meteor-depth': `${meteor.depth}px`,
                  }}
                />
              ))}
            </div>
          </div>

          <SpaceShip />

          {messages.map((message) => (
            <button
              key={message.id}
              className="xcdh-wish-star"
              style={{
                left: `${message.x}%`,
                top: `${message.y}%`,
                '--wish-depth': `${-20 + seededValue(Number(message.id) || 1, 25) * 170}px`,
              }}
              onClick={(event) => openMessage(message, event)}
              data-interactive="true"
              data-message-id={String(message.id)}
              aria-label={`查看 ${message.username} 的星愿，已被发现 ${message.click_count || 0} 次`}
            >
              <StarShape message={message} />
            </button>
          ))}
        </div>
      </div>

      {loadError && <div className="xcdh-load-error">{loadError}</div>}

      <WishPopup
        message={activeMessage}
        position={popupPosition}
        onClose={closePopup}
      />

      <WishComposer
        open={composerOpen}
        onOpen={() => setComposerOpen(true)}
        onClose={() => setComposerOpen(false)}
        onCreated={handleCreated}
      />
    </main>
  );
}


export default XcdhPage;
