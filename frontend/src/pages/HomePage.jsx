import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

function HomePage() {
  const navigate = useNavigate();

  const gameFeatures = [
    {
      title: '角色身份',
      description: '多样化的角色设定，每个角色都拥有独特的技能与使命',
      icon: '🎭'
    },
    {
      title: '阵营对抗',
      description: '好人阵营VS反派阵营，隐藏身份，智斗到底',
      icon: '⚔️'
    },
    {
      title: '昼夜交替',
      description: '白天讨论推理，夜晚暗中行动，步步惊心',
      icon: '🌓'
    },
    {
      title: '技能系统',
      description: '每个角色都有专属技能，如何使用将影响战局走向',
      icon: '✨'
    },
    {
      title: '投票机制',
      description: '通过发言与推理，投票淘汰可疑玩家，揪出真相',
      icon: '🗳️'
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
            <h1 className="text-7xl md:text-9xl font-bold text-gray-900 mb-4 tracking-wider" style={{ fontFamily: 'KaiTi, STKaiti, serif', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
              小雲殺2.0
            </h1>
            <div className="absolute -top-8 right-1/4 text-4xl animate-bounce">✨</div>
            <div className="absolute -bottom-4 left-1/4 text-3xl animate-bounce delay-200">⭐</div>
          </div>

          {/* 副标题 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              推理 · 博弈 · 阵营对抗
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              《小雲殺》是一款以推理与社交博弈为核心的阵营互动类桌游
            </p>
            <p className="text-base text-gray-600 leading-relaxed">
              玩家随机扮演不同角色，在隐藏身份的状态下，通过发言、推理与技能行动，争取让自己的阵营取得最终胜利
            </p>
          </div>

          {/* 游戏玩法 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl p-6 shadow-lg">
              <div className="text-5xl mb-3">🌙</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">夜晚行动</h3>
              <p className="text-gray-700">
                具有特殊能力的角色悄悄执行行动，暗中影响局势
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-6 shadow-lg">
              <div className="text-5xl mb-3">☀️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">白天推理</h3>
              <p className="text-gray-700">
                展开讨论、交换信息、寻找线索，投票淘汰可疑玩家
              </p>
            </div>
          </div>

          {/* 开始答题按钮 */}
          <div className="bg-gradient-to-r from-purple-200 via-pink-200 to-red-200 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              🎯 参与答题，赢取桌游！
            </h3>
            <p className="text-lg text-gray-700 mb-6">
              答对题目，即可获得一份《小雲殺》桌游<br/>
              线下活动火热进行中
            </p>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate('/quiz')}
              className="h-16 px-12 text-xl font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              开始答题挑战
            </Button>
          </div>
        </div>
      </section>

      {/* 游戏组件展示区 */}
      <section className="container mx-auto px-4 py-12 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
          🎮 游戏特色
        </h2>
        
        <div className="max-w-6xl mx-auto space-y-8">
          {gameFeatures.map((feature, index) => (
            <div 
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row items-center">
                {/* 图标区域 */}
                <div className="w-full md:w-1/2 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-8 flex items-center justify-center min-h-[300px]">
                  <div className="text-9xl">{feature.icon}</div>
                </div>
                
                {/* 内容区域 */}
                <div className="w-full md:w-1/2 p-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-3xl p-12 shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            🎊 识破迷雾，揪出真相
          </h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            你需要在迷雾与欺骗中识破对手，同时保护队友<br/>
            谁是好人？谁是反派？一切等你来揭晓！<br/><br/>
            <span className="font-bold text-xl">💎 参与线下答题活动，赢取《小雲殺》桌游！</span>
          </p>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate('/quiz')}
            className="h-16 px-16 text-xl font-bold shadow-2xl hover:scale-105 transition-transform"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            立即开始答题
          </Button>
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
