import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { componentGroups, getComponentById } from './catalog';
import ThemeToolbar from './ThemeToolbar';
import './ComponentLibrary.css';
import './ComponentLibraryExtras.css';


function ComponentLibraryShell({ activeId, children }) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const activeComponent = getComponentById(activeId);
  const currentTitle = activeComponent?.name || '组件总览';

  useEffect(() => {
    setNavigationOpen(false);
  }, [location.pathname]);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return componentGroups;

    return componentGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => (
          [item.name, item.shortName, ...item.keywords]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        )),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <div className="component-library">
      <button
        type="button"
        className={`cl-navigation-overlay ${navigationOpen ? 'is-visible' : ''}`}
        aria-label="关闭组件目录"
        onClick={() => setNavigationOpen(false)}
      />

      <aside className={`cl-sidebar ${navigationOpen ? 'is-open' : ''}`}>
        <div className="cl-brand-row">
          <Link className="cl-brand" to="/components">
            <span className="cl-brand-mark" aria-hidden="true">✦</span>
            <span>
              <strong>Cloud UI</strong>
              <small>小云自定义组件库</small>
            </span>
          </Link>
          <button
            type="button"
            className="cl-sidebar-close"
            aria-label="关闭组件目录"
            onClick={() => setNavigationOpen(false)}
          >
            ×
          </button>
        </div>

        <label className="cl-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            placeholder="搜索组件"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" aria-label="清除搜索" onClick={() => setQuery('')}>×</button>
          )}
        </label>

        <nav className="cl-navigation" aria-label="组件目录">
          <Link
            to="/components"
            className={`cl-overview-link ${activeId === 'overview' ? 'is-active' : ''}`}
          >
            <span className="cl-nav-icon" aria-hidden="true">⌂</span>
            <span>
              <strong>组件总览</strong>
              <small>设计原则与组件地图</small>
            </span>
          </Link>

          {visibleGroups.map((group) => (
            <section className="cl-nav-group" key={group.id}>
              <div className="cl-nav-heading">
                <span>{group.label}</span>
                <small>{group.items.length}</small>
              </div>
              {group.items.map((item) => (
                item.status === 'ready' ? (
                  <Link
                    key={item.id}
                    to={`/components/${item.id}`}
                    className={`cl-nav-item ${activeId === item.id ? 'is-active' : ''}`}
                  >
                    <span className="cl-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="cl-nav-copy">
                      <strong>{item.name}</strong>
                      <small>{item.shortName}</small>
                    </span>
                    <span className="cl-ready-dot" title="可用" />
                  </Link>
                ) : (
                  <div className="cl-nav-item is-planned" key={item.id}>
                    <span className="cl-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="cl-nav-copy">
                      <strong>{item.name}</strong>
                      <small>{item.shortName}</small>
                    </span>
                    <span className="cl-planned-label">规划中</span>
                  </div>
                )
              ))}
            </section>
          ))}

          {visibleGroups.length === 0 && (
            <div className="cl-search-empty">
              <span aria-hidden="true">☁</span>
              没有找到相关组件
            </div>
          )}
        </nav>

        <div className="cl-sidebar-footer">
          <span>Internal library</span>
          <strong>v0.1</strong>
        </div>
      </aside>

      <div className="cl-main">
        <header className="cl-topbar">
          <div className="cl-topbar-title">
            <button
              type="button"
              className="cl-menu-button"
              aria-label="打开组件目录"
              onClick={() => setNavigationOpen(true)}
            >
              ☰
            </button>
            <span className="cl-breadcrumb">Cloud UI</span>
            <span className="cl-breadcrumb-divider">/</span>
            <strong>{currentTitle}</strong>
          </div>
          <div className="cl-topbar-actions">
            <ThemeToolbar />
            <Link className="cl-site-link" to="/">
              返回网站
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>

        <div className="cl-content">{children}</div>
      </div>
    </div>
  );
}


export default ComponentLibraryShell;
