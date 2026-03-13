import React, { useState, useEffect } from 'react';
import { Button, Tag, Card, Timeline, Typography, Divider, Tabs, Spin, Image } from 'antd';
import { ArrowLeftOutlined, UserOutlined, ClockCircleOutlined, InfoCircleOutlined, PlayCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Title, Paragraph, Text } = Typography;

function GameRules() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get('/roles');
        setRoles(response.data);
      } catch (error) {
        console.error('Fetch roles failed', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);



  const getCampColor = (camp) => {
    if (camp.includes('好人') || camp.includes('平民') || camp.includes('神职')) return 'success';
    if (camp.includes('坏人')) return 'error';
    return 'default';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          返回首页
        </Button>

        <div className="text-center mb-10">
          <Title level={1} style={{ marginBottom: '0.5rem' }}>📖 游戏规则</Title>
          <Paragraph className="text-gray-500">小雲殺2.0 角色介绍与游戏流程</Paragraph>
        </div>

        <section className="mb-12">
          <Title level={2} className="mb-6 flex items-center gap-2">
            <InfoCircleOutlined /> 游戏介绍
          </Title>
          <Card className="shadow-sm bg-white/50">
            <Paragraph className="text-lg leading-relaxed text-gray-700">
              《小云杀》是一款以推理与社交博弈为核心的阵营互动类桌游。玩家将在游戏中随机扮演不同角色，在隐藏身份的状态下，通过发言、推理与技能行动，争取让自己的阵营取得最终胜利。
            </Paragraph>
            <Paragraph className="text-lg leading-relaxed text-gray-700 mb-0">
              在夜晚，具有特殊能力的角色悄悄执行行动；到了白天，所有人将展开讨论、交换信息、寻找线索，并用投票决定要淘汰的玩家。然而在你身边，可能就潜藏着伪装成好人的“反派”。你需要在迷雾与欺骗中识破对手，同时保护队友。
            </Paragraph>
          </Card>
        </section>

        <section className="mb-12">
          <Title level={2} className="mb-6 flex items-center gap-2">
            <UserOutlined /> 角色图鉴
          </Title>
          {loading ? <div className="text-center py-12"><Spin size="large" tip="正在加载角色数据..." /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((char, index) => (
              <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                {char.image_url && (
                  <div className="mb-4 flex justify-center bg-gray-50 rounded-lg p-2">
                    <Image
                      src={char.image_url.startsWith('http') ? char.image_url : char.image_url}
                      alt={char.name}
                      height={200}
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <Title level={4} style={{ margin: 0 }}>{char.name}</Title>
                  <Tag color={char.color}>{char.identity}</Tag>
                </div>
                <div className="mb-2">
                  <Tag bordered={false} color={getCampColor(char.camp)}>{char.camp}</Tag>
                  {char.skill !== '-' && <Tag color="purple">技能: {char.skill}</Tag>}
                </div>
                <Paragraph className="text-gray-600 mb-2 text-sm italic">
                  {char.desc}
                </Paragraph>
                
                {char.skillDetails && char.skillDetails.length > 0 && (
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {char.skillDetails.map((skill, sIndex) => (
                      <div key={sIndex} className={sIndex > 0 ? 'mt-3 pt-3 border-t border-gray-200' : ''}>
                        <Text strong className="text-indigo-800 block mb-1 text-sm">{skill.title}</Text>
                        <Text className="text-gray-600 text-xs whitespace-pre-wrap block leading-relaxed">{skill.content}</Text>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
          )}
        </section>

        <section className="mb-12">
          <Title level={2} className="mb-6 flex items-center gap-2">
            <PlayCircleOutlined /> 玩法简介
          </Title>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-l-4 border-l-blue-400">
              <Title level={4}>角色阵营</Title>
              <ul className="list-disc pl-5 text-gray-700 space-y-2">
                <li><Text strong>好人阵营：</Text>包括平民阵营和神职阵营，通过找出并淘汰所有反派来赢得胜利。</li>
                <li><Text strong>反派阵营：</Text>通过伪装与误导，使反派在人数上取得优势或消灭关键角色。</li>
              </ul>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-purple-400">
              <Title level={4}>游戏循环</Title>
              <ul className="list-disc pl-5 text-gray-700 space-y-2">
                <li><Text strong>夜晚阶段：</Text>所有人闭眼，具有技能的角色按顺序悄悄行动，主持人执行效果。</li>
                <li><Text strong>白天阶段：</Text>所有人睁眼，根据夜间发生的事件轮流发言，最后通过投票淘汰一名可疑的玩家。</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-100 text-gray-500 text-sm">
                重复上述流程，直到某个阵营达成胜利条件为止。
              </div>
            </Card>
          </div>
        </section>

        <section className="mb-12">
          <Title level={2} className="mb-6 flex items-center gap-2">
            <ClockCircleOutlined /> 游戏流程
          </Title>
          
          <Tabs
            defaultActiveKey="1"
            type="card"
            items={[
              {
                key: '1',
                label: '6-7人局',
                children: (
                  <Card className="shadow-md">
                    <Title level={4} className="mb-4 text-base">配置：2 阿鬼、2~3 魔星、1 回音雲、1 玫瑰雲（首晚可自救）</Title>
                    <Timeline
                      items={[
                        {
                          color: 'black',
                          children: <Text strong>1.1 天黑请闭眼</Text>,
                        },
                        {
                          color: 'red',
                          children: (
                            <>
                              <Text strong display="block">1.2 阿鬼行动</Text>
                              <div className="text-gray-600 mt-1">
                                “阿鬼请睁眼。阿鬼请相互确认队友身份。今晚你们要【拳击】的目标是几号？请统一意见”（待阿鬼指认后） “阿鬼请闭眼。”
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'purple',
                          children: (
                            <>
                              <Text strong display="block">1.3 玫瑰雲 (女巫) 行动</Text>
                              <div className="text-gray-600 mt-1">
                                “玫瑰雲请睁眼。今晚死亡的是 X 号玩家。你要使用【雀跃之风】救他吗？” （根据玫瑰雲手势回应） “你要使用【消逝印记】淘汰几号玩家吗？” （待玫瑰雲决策后） “玫瑰雲请闭眼。”
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'gold',
                          children: (
                            <>
                              <Text strong display="block">1.4 回音雲 (预言家) 行动</Text>
                              <div className="text-gray-600 mt-1">
                                “回音雲请睁眼。今晚你要【回音】的玩家是几号”（好人大拇指朝上，坏人大拇指朝下）“回音雲请闭眼”
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'cyan',
                          children: (
                            <>
                              <Text strong display="block">1.5 天亮了</Text>
                              <ul className="list-disc pl-5 mt-1 text-gray-600">
                                <li><strong>若有死亡：</strong>“昨晚死亡的是 X 号玩家，请 X 号玩家发表遗言，时间为30秒” （遗言结束后） “当前时间尾数为 [报出具体数字]，单数按顺时针、双数按逆时针，从死者左 / 右侧开始发言。”</li>
                                <li><strong>若平安夜：</strong>“昨晚是平安夜，无人死亡。当前时间尾数为 [报出具体数字]，单数从 1 号开始顺时针发言，双数从 6 号开始逆时针发言。”</li>
                              </ul>
                            </>
                          ),
                        },
                        {
                          color: 'blue',
                          children: (
                            <>
                              <Text strong display="block">1.6 放逐投票</Text>
                              <div className="text-gray-600 mt-1">
                                “发言阶段结束，现在开始放逐投票”
                                <ul className="list-disc pl-5 mt-1">
                                  <li><strong>单票最高：</strong>“X 号玩家得票最高，被放逐出局。请发表遗言（数量够时）。”</li>
                                  <li><strong>平票：</strong>“X 号与 Y 号玩家平票，请两位依次进行 60 秒 PK 发言，之后其余玩家再次投票；若再次平票，本日无人放逐，直接进入黑夜。”</li>
                                </ul>
                              </div>
                            </>
                          ),
                        },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: '2',
                label: '8-10人局',
                children: (
                  <Card className="shadow-md">
                    <Title level={4} className="mb-4 text-base">配置：3 阿鬼、2~4 魔星、1 回音雲、1 玫瑰雲（首晚可自救）、1 太阳雲</Title>
                    <Timeline
                      items={[
                        { color: 'black', children: <Text strong>2.1 天黑请闭眼</Text> },
                        {
                          color: 'red',
                          children: (
                            <>
                              <Text strong>2.2 阿鬼行动</Text>
                              <div className="text-gray-600 mt-1">
                                “阿鬼请睁眼...今晚你们要【拳击】的目标是几号？...阿鬼请闭眼。”
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'purple',
                          children: (
                            <>
                              <Text strong>2.3 玫瑰雲行动</Text>
                              <div className="text-gray-600 mt-1">
                                “玫瑰雲请睁眼。今晚死亡的是 X 号...是否使用【雀跃之风】？...是否使用【消逝印记】？...玫瑰雲请闭眼。”
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'gold',
                          children: (
                            <>
                              <Text strong>2.4 回音雲行动</Text>
                              <div className="text-gray-600 mt-1">
                                “回音雲请睁眼。今晚你要【回音】的玩家是几号...回音雲请闭眼”
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'orange',
                          children: (
                            <>
                              <Text strong>2.5 太阳雲 (猎人) 行动</Text>
                              <div className="text-gray-600 mt-1">
                                “太阳雲请睁眼。你的【逆光前行】状态是（正常的 大拇指朝上/失效的 大拇指朝下）。太阳雲请闭眼。” （固定流程）
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'cyan',
                          children: (
                            <>
                              <Text strong>2.6 天亮了</Text>
                              <ul className="list-disc pl-5 mt-1 text-gray-600">
                                <li><strong>若单死（含同守同救）：</strong>“昨晚死亡的是 X 号玩家，请 X 号玩家发表遗言，时间 60 秒。”...</li>
                                <li><strong>若多死：</strong>“昨晚死亡的是 X 号、Y 号玩家（从小号到大号报），请 X 号、Y 号玩家依次发表遗言，各60 秒。”...</li>
                                <li><strong>若平安夜：</strong>“昨晚是平安夜，无人死亡...”</li>
                              </ul>
                            </>
                          ),
                        },
                        {
                          color: 'blue',
                          children: (
                            <>
                              <Text strong>2.7 放逐投票</Text>
                              <div className="text-gray-600 mt-1">
                                <ul className="list-disc pl-5">
                                  <li><strong>单票最高：</strong>“X 号玩家得票最高，被放逐出局。请发表遗言。” （若为太阳雲，补充） “太阳雲请睁眼，你要【逆光前行】带走几号玩家？”</li>
                                  <li><strong>平票：</strong>PK发言 &rarr; 再次投票 &rarr; 二次平票无人放逐。</li>
                                </ul>
                              </div>
                            </>
                          ),
                        },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: '3',
                label: '11-12人局',
                children: (
                  <Card className="shadow-md">
                     <Title level={4} className="mb-2 text-base">配置：3~4阿鬼（含1困困雲）、4魔星、1回音雲、1玫瑰雲、1烟火雲、1太阳雲</Title>
                     <Text type="secondary" className="block mb-4">注：玫瑰雲首夜可自救，雀跃之风与消逝印记不能同晚使用，用完雀跃之风后夜间不再得知死亡信息，消逝印记可击穿烟火雲的【星尘弥合】</Text>
                    <Timeline
                      items={[
                        { color: 'black', children: <Text strong>3.1 天黑请闭眼</Text> },
                        {
                          color: 'green',
                          children: (
                            <>
                              <Text strong>3.2 烟火雲 (守卫) 行动</Text>
                              <div className="text-gray-600 mt-1">
                                “烟火雲请睁眼。今晚你要【星尘弥合】的玩家是几号？注意不可连续两晚【星尘弥合】同一人。”
                              </div>
                            </>
                          ),
                        },
                        { color: 'red', children: <Text strong>3.3 阿鬼行动</Text> },
                        { color: 'purple', children: <Text strong>3.4 玫瑰雲行动</Text> },
                        { color: 'gold', children: <Text strong>3.5 回音雲行动</Text> },
                        { color: 'orange', children: <Text strong>3.6 太阳雲行动</Text> },
                        {
                          color: 'cyan',
                          children: (
                            <>
                              <Text strong>3.7 天亮了</Text>
                              <div className="text-gray-600 mt-1">
                                处理 单死(60s遗言) / 多死(各60s遗言) / 平安夜
                              </div>
                            </>
                          ),
                        },
                        {
                          color: 'blue',
                          children: (
                            <>
                              <Text strong>3.8 放逐投票</Text>
                              <ul className="list-disc pl-5 mt-1 text-gray-600">
                                <li><strong>困困雲 (白狼王) 自爆：</strong>“X 号玩家（困困雲）自爆！请立即选择要带走的玩家是几号？”... “X 号玩家带走 Y 号玩家，发言中止，直接进入黑夜。”</li>
                                <li><strong>单票最高：</strong>...（若为太阳雲，补充逆光前行）...</li>
                                <li><strong>平票：</strong>PK发言 &rarr; 再次平票无人放逐。</li>
                              </ul>
                            </>
                          ),
                        },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: '4',
                label: '11-12人 (人机雲)',
                children: (
                  <Card className="shadow-md">
                     <Title level={4} className="mb-2 text-base">配置：3~4阿鬼（含1困困雲）、4魔星、1回音雲、1玫瑰雲、1人机雲、1太阳雲</Title>
                     <Text type="secondary" className="block mb-4">注：玫瑰雲首夜可自救...</Text>
                    <Timeline
                      items={[
                        { color: 'black', children: <Text strong>4.1 天黑请闭眼</Text> },
                        { color: 'red', children: <Text strong>4.2 阿鬼行动</Text> },
                        { color: 'purple', children: <Text strong>4.3 玫瑰雲行动</Text> },
                        { color: 'gold', children: <Text strong>4.4 回音雲行动</Text> },
                        { color: 'orange', children: <Text strong>4.5 太阳雲行动 (确认状态)</Text> },
                        {
                            color: 'blue',
                            children: (
                                <>
                                    <Text strong>4.6 人机雲 (白神) 行动</Text>
                                    <div className="text-gray-600 mt-1">
                                        “人机雲请睁眼。我是上帝，确认身份。人机雲请闭眼。” （仅首夜）
                                    </div>
                                </>
                            )
                        },
                        { color: 'cyan', children: <Text strong>4.7 天亮了 (同标准局)</Text> },
                        {
                          color: 'blue',
                          children: (
                            <>
                              <Text strong>4.8 放逐投票</Text>
                              <ul className="list-disc pl-5 mt-1 text-gray-600">
                                <li><strong>困困雲自爆：</strong>同上。</li>
                                <li><strong>单票最高 (非人机雲)：</strong>正常放逐。</li>
                                <li><strong>单票最高 (人机雲)：</strong>“X 号玩家得票最高。请 X 号玩家翻牌自证身份，你免除死亡，此后失去投票权但可继续发言。本局无人放逐。”</li>
                                <li><strong>平票：</strong>同上。</li>
                              </ul>
                            </>
                          ),
                        },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: '5',
                label: '12人 (机械狼)',
                children: (
                  <Card className="shadow-md">
                     <Title level={4} className="mb-2 text-base">配置：3阿鬼、1机械狼、4魔星、1回响雲、1玫瑰雲、1烟火雲、1太阳雲</Title>
                     <div className="mb-4 text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                        <strong>手势说明：</strong>魔星 = 掌心向下，回响雲 = 双手比‘眼镜’，玫瑰雲 = 比‘药瓶’，太阳雲 = 比‘枪口’，烟火雲 = 比‘盾牌’，普狼 = 单爪，机械狼 = 双爪。
                     </div>
                    <Timeline
                      items={[
                        { color: 'black', children: <Text strong>5.1/5.2 首夜，天黑请闭眼</Text> },
                        {
                            color: 'default',
                            children: (
                                <>
                                    <Text strong>5.3 身份确认</Text>
                                    <div className="text-gray-600 mt-1">
                                        “回响雲请睁眼、闭眼” “太阳雲请睁眼、闭眼”（仅让上帝确定身份）
                                    </div>
                                </>
                            )
                        },
                        { color: 'green', children: <Text strong>5.4 烟火雲行动 (星尘弥合)</Text> },
                        { color: 'red', children: <Text strong>5.5 阿鬼行动</Text> },
                        { color: 'purple', children: <Text strong>5.6 玫瑰雲行动</Text> },
                        {
                            color: 'red',
                            dot: <span style={{fontSize: '20px'}}>⚙️</span>,
                            children: (
                                <>
                                    <Text strong>5.7 机械狼行动</Text>
                                    <div className="text-gray-600 mt-1">
                                        “机械狼请睁眼。机械狼请选择行动” 【学习/不学习】
                                    </div>
                                </>
                            )
                        },
                        { color: 'orange', children: <Text strong>5.8 太阳雲行动</Text> },
                        {
                            color: 'gold',
                            children: (
                                <>
                                    <Text strong>5.9 回响雲 (通灵师) 行动</Text>
                                    <div className="text-gray-600 mt-1">
                                        “回响雲请睁眼，今晚你要【回响】的玩家是几号？（比手势）回响雲请闭眼。”
                                    </div>
                                </>
                            )
                        },
                        { color: 'cyan', children: <Text strong>5.10 天亮了</Text> },
                        { color: 'blue', children: <Text strong>5.11 放逐投票</Text> },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: '6',
                label: '警徽流',
                children: (
                  <Card className="shadow-md">
                     <Title level={4} className="mb-4 text-base">警长竞选环节 (出局环节结束后)</Title>
                    <Timeline
                      items={[
                        { children: <Text strong>6.2 “接下来，进入警长竞选环节。想要竞选警长的玩家，请举手示意”</Text> },
                        { children: <Text strong>6.3 确认上警玩家，宣布警下玩家。</Text> },
                        { children: <Text strong>6.4 竞选发言 (30秒/人)，允许退水。</Text> },
                        { children: <Text strong>6.5 确认退水。</Text> },
                        { children: <Text strong>6.6 警下玩家投票 (倒数3秒)。</Text> },
                        {
                            color: 'blue',
                            children: (
                                <>
                                    <Text strong>6.7/6.8 结果公布</Text>
                                    <ul className="list-disc pl-5 mt-1 text-gray-600">
                                        <li><strong>平票：</strong>PK发言(15s) &rarr; 再次投票。</li>
                                        <li><strong>有最大票数：</strong>“X 号玩家得票最高，当选本局警长！请警长接过警徽。警长拥有1.5 票投票权及归票权。”</li>
                                    </ul>
                                </>
                            )
                        },
                        {
                            color: 'red',
                            children: (
                                <>
                                    <Text strong>6.9/6.10 应急口播 (阿鬼自爆)</Text>
                                    <ul className="list-disc pl-5 mt-1 text-gray-600">
                                        <li><strong>警上发言阶段自爆：</strong>“X 号玩家自爆！警长竞选暂停，本局暂时无警长，直接进入天黑！”</li>
                                        <li><strong>退水/投票阶段自爆(双爆)：</strong>“X 号玩家自爆！本局触发双爆吞警徽规则，永久取消警长竞选，本局无警长！直接进入天黑！”</li>
                                    </ul>
                                </>
                            )
                        },
                      ]}
                    />
                  </Card>
                ),
              },
            ]}
          />
        </section>

        <section className="mb-12">
          <Title level={2} className="mb-6 flex items-center gap-2">
            <TrophyOutlined /> 胜利条件
          </Title>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <Title level={4} className="text-green-700">🏆 好人阵营</Title>
              <Paragraph className="text-lg text-gray-700">
                当<Text strong className="text-green-600">所有反派</Text>均被淘汰时，好人阵营胜利。
              </Paragraph>
            </Card>
            <Card className="shadow-sm bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
              <Title level={4} className="text-red-700">😈 反派阵营</Title>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Tag color="orange">≤ 8人局</Tag>
                  <span className="text-gray-700">反派淘汰所有好人阵营玩家即可获胜（屠城）。</span>
                </div>
                <div className="flex items-start gap-2">
                  <Tag color="red">&gt; 8人局</Tag>
                  <span className="text-gray-700">淘汰所有的平民阵营玩家 <Text strong>或者</Text> 淘汰所有的神职阵营玩家即可获胜（屠边）。</span>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GameRules;
