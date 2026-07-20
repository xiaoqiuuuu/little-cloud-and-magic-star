import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import XiaoyunButton, { XiaoyunButtonGroup } from '../components/xiaoyunbutton';


const buttonOptions = [
  {
    id: 'stage',
    tone: 'sky',
    eyebrow: 'MAGIC STAGE',
    label: '进入梦幻舞台',
    description: '和小云一起闪亮登场',
  },
  {
    id: 'song',
    tone: 'rose',
    eyebrow: 'SWEET MELODY',
    label: '点一首喜欢的歌',
    description: '收藏今天的心动旋律',
  },
  {
    id: 'gift',
    tone: 'violet',
    eyebrow: 'LUCKY GIFT',
    label: '打开幸运礼物',
    description: '看看云朵里藏着什么',
  },
];


function XiaoyunButtonPreview() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('stage');
  const selectedButton = buttonOptions.find((button) => button.id === selectedId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f8ff] px-5 py-10 text-slate-700 md:px-10 md:py-14">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/4 h-80 w-80 rounded-full bg-pink-200/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-200/35 blur-3xl" />

      <button
        type="button"
        onClick={() => navigate('/')}
        className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200"
      >
        <span aria-hidden="true">←</span>
        返回首页
      </button>

      <section className="relative z-10 mx-auto mt-8 max-w-6xl rounded-[36px] border border-white/90 bg-white/60 px-5 py-10 shadow-[0_24px_80px_rgba(89,123,169,0.16)] backdrop-blur-xl md:px-10 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-sky-100 px-4 py-1.5 text-xs font-extrabold tracking-[0.2em] text-sky-700">
            BUTTON COLLECTION 01
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-wide text-slate-800 md:text-5xl">
            小云的魔法入口
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-500 md:text-base">
            让人物图案从按钮里轻轻探出来，保留可爱的插画感，也让标题信息一眼就能看清。
          </p>
        </div>

        <XiaoyunButtonGroup className="mt-10 md:mt-14" label="小云功能选择">
          {buttonOptions.map((button) => (
            <XiaoyunButton
              key={button.id}
              tone={button.tone}
              eyebrow={button.eyebrow}
              label={button.label}
              description={button.description}
              selected={selectedId === button.id}
              onClick={() => setSelectedId(button.id)}
            />
          ))}
        </XiaoyunButtonGroup>

        <div
          className="mx-auto mt-9 flex max-w-xl items-center justify-center gap-2 rounded-2xl border border-white bg-white/75 px-5 py-3 text-center text-sm font-semibold text-slate-500 shadow-sm"
          aria-live="polite"
        >
          <span className="text-base" aria-hidden="true">✨</span>
          当前选择：<span className="text-sky-700">{selectedButton.label}</span>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-sm text-slate-500 md:grid-cols-3">
          <div className="rounded-2xl bg-white/65 p-4 text-center">
            <div className="font-bold text-slate-700">三种主题</div>
            <div className="mt-1">sky / rose / violet</div>
          </div>
          <div className="rounded-2xl bg-white/65 p-4 text-center">
            <div className="font-bold text-slate-700">三种尺寸</div>
            <div className="mt-1">small / medium / large</div>
          </div>
          <div className="rounded-2xl bg-white/65 p-4 text-center">
            <div className="font-bold text-slate-700">完整交互</div>
            <div className="mt-1">选中、禁用、加载、键盘焦点</div>
          </div>
        </div>
      </section>
    </main>
  );
}


export default XiaoyunButtonPreview;
