import { useEffect, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { ArrowRightOutlined, ExportOutlined, HomeOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api';


const themeStyles = {
  aurora: {
    page: 'from-blue-200 via-pink-100 to-orange-50',
    badge: 'bg-white/75 text-indigo-700',
    rule: 'from-blue-100 via-indigo-100 to-purple-100',
    cta: 'from-indigo-200 via-purple-200 to-pink-200',
    footer: 'from-indigo-900 to-purple-900',
  },
  sunset: {
    page: 'from-orange-200 via-rose-100 to-amber-50',
    badge: 'bg-white/75 text-rose-700',
    rule: 'from-orange-100 via-rose-100 to-pink-100',
    cta: 'from-orange-200 via-rose-200 to-pink-200',
    footer: 'from-rose-900 to-orange-900',
  },
  ocean: {
    page: 'from-cyan-200 via-blue-100 to-indigo-50',
    badge: 'bg-white/75 text-blue-700',
    rule: 'from-cyan-100 via-blue-100 to-indigo-100',
    cta: 'from-cyan-200 via-blue-200 to-indigo-200',
    footer: 'from-blue-950 to-cyan-900',
  },
  mint: {
    page: 'from-emerald-200 via-teal-100 to-lime-50',
    badge: 'bg-white/75 text-emerald-700',
    rule: 'from-emerald-100 via-teal-100 to-cyan-100',
    cta: 'from-emerald-200 via-teal-200 to-cyan-200',
    footer: 'from-emerald-950 to-teal-900',
  },
};

const ctaLinkClasses = {
  primary: 'border-slate-900 bg-slate-900 text-white shadow-lg hover:border-slate-800 hover:bg-slate-800',
  light: 'border-white/80 bg-white/75 text-slate-800 shadow-sm hover:bg-white',
  outline: 'border-slate-700/60 bg-transparent text-slate-800 hover:border-slate-900 hover:bg-white/30',
};


function getResourceKind(url = '') {
  if (/\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(url)) return 'image';
  if (/\.(m4v|mov|mp4|ogg|webm)(?:[?#].*)?$/i.test(url)) return 'video';
  if (/\.(aac|flac|m4a|mp3|wav)(?:[?#].*)?$/i.test(url)) return 'audio';
  return 'link';
}


function resourceLabel(kind, index) {
  const labels = { image: '查看图片', video: '播放视频', audio: '收听音频', link: '打开资源' };
  return `${labels[kind]}${index > 0 ? ` ${index + 1}` : ''}`;
}


function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const previewId = new URLSearchParams(location.search).get('preview');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const eventUrl = previewId
      ? `/admin/site-events/${previewId}`
      : slug ? `/site-events/${slug}` : '/site-events/current';

    api.get(eventUrl, { hideLoading: true, hideErrorMessage: true })
      .then((eventResponse) => {
        if (cancelled) return;
        setEvent(eventResponse.data);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error('加载官网活动失败:', requestError);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewId, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-pink-50">
        <Spin size="large" tip="正在加载活动..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Result
          status="404"
          title="暂时没有可展示的活动"
          subTitle="活动可能尚未发布，或这个活动链接已经失效。"
          extra={slug && (
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
              返回当前主页
            </Button>
          )}
        />
      </div>
    );
  }

  const content = event.content;
  const theme = themeStyles[content.theme] || themeStyles.aurora;
  const eventMeta = [event.date_label, event.location].filter(Boolean).join(' · ');
  const materials = content.materials || [];
  const highlights = content.highlights || [];
  const ctaLinks = content.cta.links || [];
  const hasCta = Boolean(content.cta.title || content.cta.description || ctaLinks.length);

  const openRules = () => {
    if (!content.rules.link) return;
    if (/^https?:\/\//.test(content.rules.link)) {
      window.location.href = content.rules.link;
      return;
    }
    navigate(content.rules.link, {
      state: { returnTo: `${location.pathname}${location.search}` },
    });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.page} relative overflow-hidden`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 rotate-45 animate-shooting-star" />
        <div className="absolute top-1/3 right-10 w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 rotate-45 animate-shooting-star delay-500" />
      </div>

      <section className="container mx-auto px-4 py-12 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {(content.eyebrow || eventMeta) && (
            <div className={`inline-flex flex-wrap justify-center gap-x-3 gap-y-1 rounded-full px-5 py-2 mb-7 shadow-sm ${theme.badge}`}>
              {content.eyebrow && <span className="font-semibold">{content.eyebrow}</span>}
              {eventMeta && <span>{eventMeta}</span>}
            </div>
          )}

          <div className="relative mb-8">
            <h1
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 tracking-wider whitespace-pre-line"
              style={{ fontFamily: 'KaiTi, STKaiti, serif', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}
            >
              {content.title}
            </h1>
          </div>

          <nav className="mb-8 flex flex-wrap justify-center gap-3" aria-label="首页内容导航">
            {(content.intro_title || content.intro) && (
              <a href="#event-intro" className="rounded-full border border-white/80 bg-white/65 px-5 py-2.5 font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                活动介绍
              </a>
            )}
            {content.rules.enabled && (
              <a href="#event-rules" className="rounded-full border border-white/80 bg-white/65 px-5 py-2.5 font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                玩法规则
              </a>
            )}
            {materials.length > 0 && (
              <a href="#event-materials" className="rounded-full bg-slate-900 px-5 py-2.5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800">
                精选物料
              </a>
            )}
            {hasCta && (
              <a href="#event-cta" className="rounded-full border border-white/80 bg-white/65 px-5 py-2.5 font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                获取方式
              </a>
            )}
          </nav>

          {(content.intro_title || content.intro) && (
            <div id="event-intro" className="scroll-mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl">
              {content.intro_title && (
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                  {content.intro_title}
                </h2>
              )}
              {content.intro && (
                <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                  {content.intro}
                </p>
              )}
            </div>
          )}

          {highlights.length > 0 && (
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {highlights.map((highlight, index) => (
                <div
                  key={`${highlight.value}-${highlight.label}-${index}`}
                  className="rounded-2xl border border-white/70 bg-white/55 px-4 py-5 text-left shadow-sm backdrop-blur"
                >
                  <strong className="block text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    {highlight.value}
                  </strong>
                  <span className="mt-1 block text-sm font-medium text-slate-600">{highlight.label}</span>
                </div>
              ))}
            </div>
          )}

          {content.rules.enabled && (
            <button
              id="event-rules"
              type="button"
              onClick={openRules}
              className={`w-full text-left cursor-pointer bg-gradient-to-r ${theme.rule} rounded-2xl p-8 mb-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group`}
            >
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 flex flex-wrap items-center gap-2">
                    📖 {content.rules.title}
                    <span className="text-sm font-normal bg-white/50 px-2 py-1 rounded-full text-indigo-600">
                      {content.rules.link_label}
                    </span>
                  </h3>
                  <p className="text-lg text-gray-700 max-w-2xl whitespace-pre-line">
                    {content.rules.description}
                  </p>
                </div>
                <div className="hidden md:flex gap-4 text-5xl opacity-80 group-hover:scale-110 transition-transform">
                  {content.rules.icons.map((icon, index) => <span key={`${icon}-${index}`}>{icon}</span>)}
                </div>
              </div>
            </button>
          )}
        </div>
      </section>

      {materials.length > 0 && (
        <section id="event-materials" className="container mx-auto scroll-mt-6 px-4 py-12 relative z-10">
          <div className="mb-12 text-center">
            <span className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Selected works</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-black text-center text-gray-900">
            {content.materials_title}
            </h2>
            <p className="mt-3 text-slate-600">所有内容均与物料库同步，更新后会自动呈现在这里。</p>
          </div>
          <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
            {materials.map((material, index) => {
              const resources = material.resources || [];
              const coverUrl = resources[0] || '';
              const coverKind = getResourceKind(coverUrl);
              return (
                <article
                  key={material.id || `${material.name}-${index}`}
                  className={`group overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.78] shadow-lg backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${index === 0 && materials.length % 2 === 1 ? 'md:col-span-2 md:grid md:grid-cols-2' : ''}`}
                >
                  <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-indigo-100">
                    {coverKind === 'image' && (
                      <img src={coverUrl} alt={material.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    )}
                    {coverKind === 'video' && (
                      <video src={coverUrl} controls preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    {coverKind === 'audio' && (
                      <div className="w-full px-8 text-center">
                        <div className="mb-5 text-6xl">♫</div>
                        <audio src={coverUrl} controls preload="metadata" className="w-full" />
                      </div>
                    )}
                    {(!coverUrl || coverKind === 'link') && (
                      <div className="text-center text-slate-500">
                        <div className="mb-3 text-6xl">✦</div>
                        <p className="font-semibold">{coverUrl ? '点击下方打开资源' : '物料资源准备中'}</p>
                      </div>
                    )}
                    <span className="absolute left-5 top-5 rounded-full bg-slate-950/[0.82] px-3 py-1 text-xs font-bold text-white backdrop-blur">
                      #{material.id}
                    </span>
                  </div>
                  <div className="flex min-h-[260px] flex-col p-7 md:p-8">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <h3 className="text-2xl md:text-3xl font-black text-gray-900">
                        {material.name}
                      </h3>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                        {resources.length} 个资源
                      </span>
                    </div>
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-line">
                      {material.description || '这份物料的介绍正在准备中。'}
                    </p>
                    <div className="mt-auto pt-6">
                      {(material.creator || []).length > 0 && (
                        <p className="mb-3 text-xs font-semibold text-slate-500">
                          创作：{material.creator.join(' · ')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {resources.slice(0, 4).map((resource, resourceIndex) => {
                          const kind = getResourceKind(resource);
                          return (
                            <a
                              key={`${resource}-${resourceIndex}`}
                              href={resource}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              {resourceLabel(kind, resourceIndex)}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {hasCta && (
        <section id="event-cta" className="container mx-auto scroll-mt-6 px-4 py-16 relative z-10">
          <div className={`max-w-3xl mx-auto text-center bg-gradient-to-r ${theme.cta} rounded-3xl p-8 md:p-12 shadow-xl`}>
            {content.cta.title && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">{content.cta.title}</h2>
            )}
            {content.cta.description && (
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                {content.cta.description}
              </p>
            )}
            {ctaLinks.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {ctaLinks.map((link, index) => {
                  const className = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 py-3 font-bold transition duration-200 hover:-translate-y-0.5 ${ctaLinkClasses[link.variant] || ctaLinkClasses.primary}`;
                  const key = `${link.label}-${link.url}-${index}`;
                  if (/^https?:\/\//i.test(link.url)) {
                    return (
                      <a
                        key={key}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                      >
                        {link.label} <ExportOutlined />
                      </a>
                    );
                  }
                  return (
                    <button key={key} type="button" onClick={() => navigate(link.url)} className={className}>
                      {link.label} <ArrowRightOutlined />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className={`bg-gradient-to-r ${theme.footer} text-indigo-100 py-10 mt-20 relative z-10`}>
        <div className="container mx-auto px-4 text-center">
          {content.footer.title && <p className="text-xl mb-3 font-bold">{content.footer.title}</p>}
          {content.footer.copyright && <p className="text-sm opacity-90">{content.footer.copyright}</p>}
          {content.footer.note && <p className="text-xs opacity-75 mt-2">{content.footer.note}</p>}
        </div>
      </footer>
    </div>
  );
}


export default HomePage;
