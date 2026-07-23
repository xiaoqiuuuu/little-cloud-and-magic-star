import { useEffect, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
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


const materialColors = {
  rose: 'bg-rose-100',
  pink: 'bg-pink-100',
  yellow: 'bg-yellow-100',
  blue: 'bg-blue-100',
  indigo: 'bg-indigo-100',
  purple: 'bg-purple-100',
};


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

          {(content.intro_title || content.intro) && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl">
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

          {content.rules.enabled && (
            <button
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

      {content.materials.length > 0 && (
        <section className="container mx-auto px-4 py-12 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            {content.materials_title}
          </h2>
          <div className="max-w-6xl mx-auto space-y-8">
            {content.materials.map((material, index) => (
              <div
                key={`${material.title}-${index}`}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row items-center">
                  <div className={`w-full md:w-1/2 ${materialColors[material.color] || materialColors.blue} flex items-center justify-center min-h-[300px]`}>
                    {material.image ? (
                      <img src={material.image} alt={material.title} className="w-full h-full object-cover max-h-[400px]" />
                    ) : (
                      <div className="p-8 text-center">
                        <div className="text-6xl mb-4">{material.icon}</div>
                        <p className="text-gray-500 font-medium">图片稍后补充</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-1/2 p-8">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                      {material.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-line">
                      {material.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(content.cta.title || content.cta.description) && (
        <section className="container mx-auto px-4 py-16 relative z-10">
          <div className={`max-w-3xl mx-auto text-center bg-gradient-to-r ${theme.cta} rounded-3xl p-8 md:p-12 shadow-xl`}>
            {content.cta.title && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">{content.cta.title}</h2>
            )}
            {content.cta.description && (
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                {content.cta.description}
              </p>
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
