import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

function HomePage() {
  const navigate = useNavigate();

  const gameComponents = [
    {
      title: '角色卡牌',
      description: '本次角色卡共计10种角色/13张卡牌，不同于1.0的选材，2.0选择用铜版纸+磨砂卡套的设计，更加注重实际桌游的游玩体验。',
      placeholderColor: 'bg-rose-100',
      icon: '🃏',
      image: '/juesepai.jpg'
    },
    {
      title: '数字卡牌',
      description: '新增13张数字牌，更方便玩家线下游玩。',
      placeholderColor: 'bg-pink-100',
      icon: '🔢',
      image: '/shuzipai.jpg'
    },
    {
      title: '亚克力警徽',
      description: '新增特殊游戏配件：亚克力警徽',
      placeholderColor: 'bg-yellow-100',
      icon: '🛡️',
      image: '/yakelijinghui.jpg'
    },
    {
      title: '说明书',
      description: '提供游戏介绍、人物介绍、玩法简介等内容。方便魔星们更快上手《小雲殺》。',
      placeholderColor: 'bg-blue-100',
      icon: '📖',
      image: '/shuomingshu.jpg'
    },
    {
      title: '收纳盒&收纳袋',
      description: '方便魔星们更好的收藏、携带《小雲殺》。（要好好保护卡牌哦）',
      placeholderColor: 'bg-indigo-100',
      icon: '📦',
      image: '/hezishounadai.jpg'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 via-pink-100 to-orange-50 relative overflow-hidden">
      {/* 装饰性星星 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-2xl animate-pulse">✨</div>
        <div className="absolute top-20 right-20 text-xl animate-pulse delay-100">⭐</div>
        <div className="absolute top-40 left-1/4 text-lg animate-pulse delay-200">💫</div>
        <div className="absolute top-60 right-1/3 text-2xl animate-pulse delay-300">🌟</div>
        <div className="absolute bottom-40 left-1/3 text-xl animate-pulse">✨</div>
        <div className="absolute bottom-20 right-1/4 text-lg animate-pulse delay-100">⭐</div>
        
        {/* 流星装饰 */}
        <div className="absolute top-1/4 left-0 w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 transform rotate-45 animate-shooting-star"></div>
        <div className="absolute top-1/3 right-10 w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 transform rotate-45 animate-shooting-star delay-500"></div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* 主标题 */}
          <div className="relative mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-wider" style={{ fontFamily: 'KaiTi, STKaiti, serif', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
              肥音卤果创意者联盟
              <br />
              深圳无料——桌游上新
            </h1>
            <div className="absolute -top-8 right-1/4 text-4xl animate-bounce">✨</div>
            <div className="absolute -bottom-4 left-1/4 text-3xl animate-bounce delay-200">⭐</div>
          </div>

          {/* 副标题 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              万众期待 - 小雲殺2.0 无料介绍
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              《小雲殺》是一款以推理与社交博弈为核心的阵营互动类桌游。玩家将在游戏中随机扮演不同角色，在隐藏身份的状态下，通过发言、推理与技能行动，争取让自己的阵营取得最终胜利。
            </p>
          </div>

          {/* 游戏规则 - 入口 */}
          <div 
            onClick={() => navigate('/rules')}
            className="cursor-pointer bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-2xl p-8 mb-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                  📖 游戏玩法与规则
                  <span className="text-sm font-normal bg-white/50 px-2 py-1 rounded-full text-indigo-600">点击查看</span>
                </h3>
                <p className="text-lg text-gray-700 max-w-2xl">
                  了解面包雲、阿鬼等12位角色的独特技能，掌握6-12人局的完整游戏流程。
                  <br/>
                  <span className="text-sm text-gray-500 mt-2 block group-hover:text-indigo-600 transition-colors">
                    点击此处进入规则详情页 &rarr;
                  </span>
                </p>
              </div>
              <div className="hidden md:flex gap-4 text-5xl opacity-80 group-hover:scale-110 transition-transform">
                <span>🌙</span>
                <span>☀️</span>
                <span>🎭</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 游戏组件展示区 */}
      <section className="container mx-auto px-4 py-12 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
          精彩物料一览
        </h2>
        
        <div className="max-w-6xl mx-auto space-y-8">
          {gameComponents.map((component, index) => (
            <div 
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row items-center">
                {/* 图片展示区域 */}
                <div className={`w-full md:w-1/2 ${component.placeholderColor} flex items-center justify-center min-h-[300px]`}>
                  {component.image ? (
                     <img 
                       src={component.image} 
                       alt={component.title} 
                       className={`w-full h-full object-cover max-h-[400px] ${component.rotateClass || ''}`}
                     />
                  ) : (
                    <div className="p-8 text-center">
                       <div className="text-6xl mb-4">{component.icon}</div>
                       <p className="text-gray-500 font-medium">（此处稍后补充实物图片）</p>
                    </div>
                  )}
                </div>
                
                {/* 内容区域 */}
                <div className="w-full md:w-1/2 p-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                    {component.title}
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {component.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 获取方式 Call to Action */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-3xl p-12 shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            🎉 获取方式
          </h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            本次《小雲殺2.0》依旧采取<span className="font-bold text-indigo-700">线下答题</span>以及<span className="font-bold text-pink-700">线上抽奖</span>两种形式获取。<br/>
            要好好复习面包的演唱会以及其他相关视频哦！<br/>
            <span className="text-sm text-gray-600 mt-2 block">（题库来源：演唱会、综艺、微博、Vlog）</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-indigo-900 to-purple-900 text-indigo-100 py-10 mt-20 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xl mb-3 font-bold">⭐ 小雲殺2.0 ⭐</p>
          <p className="text-sm opacity-90">© 2026 版权所有 · 肥音卤果创意者联盟</p>
          <p className="text-xs opacity-75 mt-2">黄霄雲2025「宇宙无敌号」巡演-深圳收官站 · 物料发放</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shooting-star {
          0% {
            transform: translateX(-100px) translateY(-100px) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(1000px) translateY(1000px) rotate(45deg);
            opacity: 0;
          }
        }
        .animate-shooting-star {
          animation: shooting-star 3s ease-in-out infinite;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
        .delay-500 {
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
}

export default HomePage;
