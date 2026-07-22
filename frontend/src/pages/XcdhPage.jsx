import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './XcdhPage.css';


const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const POPUP_HEIGHT = 190;


const clamp = (value, min, max) => Math.min(Math.max(value, min), max);


const seededValue = (index, salt = 0) => {
  const value = Math.sin((index + 1) * 9283.31 + salt * 77.17) * 43758.5453;
  return value - Math.floor(value);
};


const createBackgroundStars = () => Array.from({ length: 360 }, (_, index) => ({
  id: `background-star-${index}`,
  x: seededValue(index, 1) * WORLD_WIDTH,
  y: seededValue(index, 2) * WORLD_HEIGHT,
  size: 0.6 + seededValue(index, 3) * 2.8,
  opacity: 0.22 + seededValue(index, 4) * 0.75,
  duration: 2.2 + seededValue(index, 5) * 5.5,
  delay: seededValue(index, 6) * -7,
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
  const fill = variant > 0.82 ? '#fff3b0' : variant > 0.58 ? '#dbeafe' : '#ffffff';
  const glow = variant > 0.82 ? '#f59e0b' : variant > 0.58 ? '#60a5fa' : '#38bdf8';
  const size = 21 + seededValue(Number(message.id) || 1, 22) * 12;
  const rotation = seededValue(Number(message.id) || 1, 23) * 42;
  const duration = 2.3 + seededValue(Number(message.id) || 1, 24) * 2.8;

  return (
    <span
      className="xcdh-wish-star__visual"
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
      <div className="xcdh-spaceship__wake" />
      <svg viewBox="0 0 980 300">
        <defs>
          <linearGradient id="shipArmor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#111827" />
            <stop offset="0.42" stopColor="#475569" />
            <stop offset="0.68" stopColor="#1e293b" />
            <stop offset="1" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="shipArmorLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#334155" />
            <stop offset="0.48" stopColor="#94a3b8" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="shipEnergy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0ea5e9" stopOpacity="0" />
            <stop offset="0.45" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="shipFlame" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.16" stopColor="#67e8f9" />
            <stop offset="0.58" stopColor="#2563eb" stopOpacity=".55" />
            <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <filter id="shipGlow" x="-50%" y="-80%" width="200%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="shipShadow" x="-30%" y="-60%" width="170%" height="220%">
            <feDropShadow dx="0" dy="12" stdDeviation="13" floodColor="#020617" floodOpacity=".9" />
          </filter>
        </defs>
        <g className="xcdh-ship-thrusters" filter="url(#shipGlow)">
          <path d="M170 103H6l120 28h54Z" fill="url(#shipFlame)" />
          <path d="M172 139H0l128 22h52Z" fill="url(#shipFlame)" opacity=".9" />
          <path d="M170 175H18l112 25h50Z" fill="url(#shipFlame)" opacity=".78" />
        </g>
        <g filter="url(#shipShadow)">
          <path d="M182 123 334 60l386 5 242 80-238 88-390 5-154-70Z" fill="#020617" opacity=".72" />
          <path d="M167 114 303 65l412 9 247 72-247 73-412 8-136-48Z" fill="url(#shipArmor)" stroke="#64748b" strokeWidth="4" />
          <path d="m298 66 122-48 250 14 118 57-85 32-361-4Z" fill="url(#shipArmorLight)" stroke="#64748b" strokeWidth="3" />
          <path d="m304 225 126 54 245-18 114-58-87-30-356 9Z" fill="#111827" stroke="#475569" strokeWidth="3" />
          <path d="M351 82 212 7l350 55 94 57-280-12Z" fill="#182235" stroke="#64748b" strokeWidth="3" />
          <path d="m355 207-145 83 360-69 92-54-288 13Z" fill="#0b1220" stroke="#475569" strokeWidth="3" />
          <path d="M426 61 490 20h151l89 48-74 25-220-4Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="3" />
          <path d="M488 52 524 30h93l53 28-43 15-128-2Z" fill="#0c4a6e" stroke="#67e8f9" strokeWidth="2" />
          <path d="M193 116h120l33 26-34 38H190l-28-31Z" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
          <path d="M710 76 962 146 713 218l84-73Z" fill="#111827" stroke="#94a3b8" strokeWidth="3" />
          <path d="m790 111 172 35-171 37 52-37Z" fill="#334155" />
          <path d="M296 143h572" stroke="url(#shipEnergy)" strokeWidth="5" filter="url(#shipGlow)" />
          <path d="M346 119 698 124M350 176l350-8" stroke="#94a3b8" strokeOpacity=".42" strokeWidth="3" />
          <path d="m404 91 26 25-18 27-27-25ZM505 93l25 26-18 25-26-25ZM608 96l24 25-18 24-25-24Z" fill="#020617" stroke="#475569" strokeWidth="2" />
          <path d="m429 189 27-25 27 23-26 25ZM537 188l26-25 27 22-26 26ZM646 185l25-24 27 20-25 27Z" fill="#020617" stroke="#334155" strokeWidth="2" />
          <g fill="#fde68a" filter="url(#shipGlow)">
            <circle cx="338" cy="143" r="4" /><circle cx="424" cy="143" r="4" /><circle cx="514" cy="143" r="4" />
            <circle cx="606" cy="143" r="4" /><circle cx="700" cy="143" r="4" /><circle cx="790" cy="143" r="4" />
          </g>
          <g className="xcdh-ship-navigation-lights" fill="#67e8f9" filter="url(#shipGlow)">
            <circle cx="266" cy="104" r="6" /><circle cx="266" cy="190" r="6" /><circle cx="922" cy="146" r="7" />
          </g>
          <text x="545" y="157" textAnchor="middle" fill="#e2e8f0" fontFamily="system-ui, sans-serif" fontSize="25" fontWeight="700" letterSpacing="8">宇宙无敌号</text>
          <text x="548" y="178" textAnchor="middle" fill="#67e8f9" fontFamily="system-ui, sans-serif" fontSize="10" letterSpacing="5">UNCONQUERED · FLAGSHIP</text>
        </g>
      </svg>
    </div>
  );
}


function WishPopup({ message, position, onClose }) {
  if (!message || !position) return null;

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
        <span>✦ 已被发现 {message.click_count || 0} 次</span>
        <span>星愿 #{message.id}</span>
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
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const activeMessageIdRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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

  const updateOffset = useCallback((nextOffset) => {
    const viewport = viewportRef.current;
    if (!viewport) return nextOffset;
    const minX = Math.min(0, viewport.clientWidth - WORLD_WIDTH);
    const minY = Math.min(0, viewport.clientHeight - WORLD_HEIGHT);
    const clamped = {
      x: clamp(nextOffset.x, minX, 0),
      y: clamp(nextOffset.y, minY, 0),
    };
    offsetRef.current = clamped;
    setOffset(clamped);
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

  const focusMessage = useCallback((message) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const worldX = (message.x / 100) * WORLD_WIDTH;
    const worldY = (message.y / 100) * WORLD_HEIGHT;
    const focusedOffset = updateOffset({
      x: viewport.clientWidth / 2 - worldX,
      y: viewport.clientHeight / 2 - worldY,
    });
    window.setTimeout(() => {
      const width = Math.min(310, window.innerWidth - 32);
      const halfWidth = width / 2;
      const starLeft = worldX + focusedOffset.x;
      const starTop = worldY + focusedOffset.y;
      const placement = window.innerHeight - starTop >= POPUP_HEIGHT + 110 ? 'below' : 'above';
      activeMessageIdRef.current = message.id;
      setActiveMessage(message);
      setPopupPosition({
        left: clamp(starLeft, 16 + halfWidth, window.innerWidth - 16 - halfWidth),
        top: placement === 'below'
          ? clamp(starTop + 28, 110, window.innerHeight - POPUP_HEIGHT - 90)
          : Math.max(86, starTop - POPUP_HEIGHT - 24),
        width,
        placement,
      });
    }, 360);
  }, [updateOffset]);

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
    };
  }, [centerUniverse, closePopup, updateOffset]);

  useEffect(() => {
    let canceled = false;
    fetch('/api/xcdh/messages')
      .then((response) => {
        if (!response.ok) throw new Error('星愿暂时迷失在宇宙中');
        return response.json();
      })
      .then((data) => {
        if (!canceled) setMessages(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!canceled) setLoadError(error.message || '星愿加载失败');
      });
    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    const startMusic = (event) => {
      if (event.target?.closest?.('.xcdh-toolbar')) return;
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      audio.volume = 0.12;
      audio.play().then(() => setMusicPlaying(true)).catch(() => {});
    };
    window.addEventListener('pointerdown', startMusic, { once: true });
    window.addEventListener('keydown', startMusic, { once: true });
    return () => {
      window.removeEventListener('pointerdown', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
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
    updateOffset({
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY,
    });
  };

  const finishDragging = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const openMessage = async (message, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(310, window.innerWidth - 32);
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
        <p>拖动宇宙，寻找每一颗为梦想亮起的星</p>
      </header>

      <div className="xcdh-toolbar" data-interactive="true">
        <div className="xcdh-toolbar__stats">
          <strong>{messages.length}</strong> 颗星愿
          <span>·</span>
          被发现 <strong>{totalDiscoveries}</strong> 次
        </div>
        <button onClick={centerUniverse}>回到星海中心</button>
        <button onClick={toggleMusic} aria-label={musicPlaying ? '暂停背景音乐' : '播放背景音乐'}>
          {musicPlaying ? '♫ 音乐开启' : '♪ 播放音乐'}
        </button>
      </div>

      <div
        ref={viewportRef}
        className={`xcdh-viewport ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
      >
        <div
          className="xcdh-universe"
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          }}
        >
          <div className="xcdh-nebula xcdh-nebula--one" />
          <div className="xcdh-nebula xcdh-nebula--two" />
          <div className="xcdh-nebula xcdh-nebula--three" />
          <div className="xcdh-galaxy" aria-hidden="true" />
          <div className="xcdh-planet xcdh-planet--blue" aria-hidden="true" />
          <div className="xcdh-planet xcdh-planet--ringed" aria-hidden="true"><span /></div>
          <div className="xcdh-moon" aria-hidden="true" />

          {backgroundStars.map((star) => (
            <i
              key={star.id}
              className="xcdh-background-star"
              style={{
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                background: star.color,
                '--twinkle-duration': `${star.duration}s`,
                '--twinkle-delay': `${star.delay}s`,
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
              }}
            />
          ))}

          <SpaceShip />

          {messages.map((message) => (
            <button
              key={message.id}
              className="xcdh-wish-star"
              style={{ left: `${message.x}%`, top: `${message.y}%` }}
              onClick={(event) => openMessage(message, event)}
              data-interactive="true"
              aria-label={`查看 ${message.username} 的星愿，已被发现 ${message.click_count || 0} 次`}
            >
              <StarShape message={message} />
            </button>
          ))}
        </div>
      </div>

      <div className="xcdh-drag-hint" aria-hidden="true">
        <span>↔</span> 按住并拖动探索宇宙
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
