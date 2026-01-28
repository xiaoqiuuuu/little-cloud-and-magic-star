"""数据库初始化"""

import os
import json
from .config import get_connection


def init_db():
    """初始化数据库，创建所有表"""
    conn = get_connection()
    cursor = conn.cursor()

    # Create page visits table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS page_visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            referrer TEXT,
            user_agent TEXT
        )
    ''')

    # 创建题目表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            resources TEXT,
            tag TEXT NOT NULL,
            random_clicks INTEGER DEFAULT 0,
            hide_clicks INTEGER DEFAULT 0,
            author TEXT DEFAULT ""
        )
    ''')

    # 创建管理员表（默认管理员 admin/admin123）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')

    # 创建物料表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            creator TEXT,
            resources TEXT
        )
    ''')

    # 创建制作人表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS producers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            profile_url TEXT
        )
    ''')

    # 创建角色表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            desc TEXT NOT NULL,
            skill TEXT,
            camp TEXT NOT NULL,
            identity TEXT NOT NULL,
            color TEXT NOT NULL,
            skillDetails TEXT,
            image_url TEXT
        )
    ''')

    # 检查并添加新列（如果表已存在但没有这些列）
    cursor.execute("PRAGMA table_info(questions)")
    columns = [column[1] for column in cursor.fetchall()]

    if 'random_clicks' not in columns:
        cursor.execute(
            'ALTER TABLE questions ADD COLUMN random_clicks INTEGER DEFAULT 0')

    if 'hide_clicks' not in columns:
        cursor.execute(
            'ALTER TABLE questions ADD COLUMN hide_clicks INTEGER DEFAULT 0')

    if 'author' not in columns:
        cursor.execute(
            'ALTER TABLE questions ADD COLUMN author TEXT DEFAULT ""')

    # 插入默认管理员账号（仅在开发环境）
    env = os.getenv('ENVIRONMENT', 'development')
    if env == 'development':
        cursor.execute('SELECT COUNT(*) FROM admins WHERE username = ?', ('admin',))
        if cursor.fetchone()[0] == 0:
            # 使用更安全的默认密码（开发环境）
            cursor.execute(
                'INSERT INTO admins (username, password) VALUES (?, ?)',
                ('admin', 'CloudStar@2026!')
            )
            print("✅ [开发环境] 已创建默认管理员账号: admin / CloudStar@2026!")
    else:
        print("ℹ️  [生产环境] 跳过默认管理员账号创建，请手动创建管理员")

    # 创建系统配置表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS configs (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')

    # 初始化配置项（如果不存在）
    cursor.execute('INSERT OR IGNORE INTO configs (key, value) VALUES (?, ?)', 
                  ('COUNTDOWN_SECONDS', '60'))

    # 初始化默认角色（如果角色表为空）
    cursor.execute('SELECT COUNT(*) FROM roles')
    if cursor.fetchone()[0] == 0:
        default_roles = [
            ('面包雲', '爱吃面包的小雲，最钟爱的是香葱肉松卷。', '-', '平民阵营', '村民', 'blue', '[]', None),
            ('糖果雲', '远远飘来甜甜的小雲，包里永远装满彩色软糖。', '-', '平民阵营', '村民', 'blue', '[]', None),
            ('阿鬼', '喜欢熬夜的鬼鬼，当看到不听话的魔星淋着雨不打伞，会非常生气。', '给你一拳, 消散', '坏人阵营', '狼人', 'red', json.dumps([
                { 'title': '给你一拳', 'content': '作为正义的克星，每晚可以与同伴投票选择一名玩家给TA“一拳”，被拳击玩家白天将会出局。' },
                { 'title': '消散', 'content': '白天的任意时刻，可翻牌宣告“消散”。白天强制结束，游戏进入黑夜，你当即出局。' }
            ], ensure_ascii=False), None),
            ('人机雲', '害羞的小雲，会在某些场合宕机大脑，化身人机放空自己，或变成E人强颜欢笑。', '宕机', '神职阵营', '白神', 'gold', json.dumps([
                { 'title': '宕机', 'content': '在白天被投票出局时，会自动触发系统“宕机”保护，让自己继续存活，保留发言权，但不再拥有投票权。' }
            ], ensure_ascii=False), None),
            ('魔星', '来自浩瀚宇宙的各个角落，立志要陪面包开完一百场演唱会。', '无 / 给你一拳(被动)', '平民阵营', '村民', 'blue', json.dumps([
                { 'title': '盲选局被动', 'content': '盲选局中无任何技能，通灵师查验显示【魔星】，纯靠发言伪装。当所有【阿鬼】出局后获得【给你一拳】。' }
            ], ensure_ascii=False), None),
            ('困困雲', '喜欢在梅雨季节睡懒觉的小雲，当她困到睁不开眼睛时便会再一觉睡到大天亮。', '没语, 给你一拳', '坏人阵营', '白狼王', 'red', json.dumps([
                { 'title': '没语 (自爆带人)', 'content': '小雲会惩罚一名偷偷熬夜的玩家下场睡觉，即你和被选择的玩家一同出局。\n——“昨天晚上又没好好睡觉吧”，“听吧，外面的雨声便是她为你奏响的眠歌”，嘿嘿，小雲才不会告诉你，是她想睡觉了呢。' },
                { 'title': '给你一拳', 'content': '参与夜间狼人行动。' }
            ], ensure_ascii=False), None),
            ('回音雲', '在星空中寻觅自我的小雲，会在回音中聆听真相。', '回音', '神职阵营', '预言家', 'gold', json.dumps([
                { 'title': '回音', 'content': '每晚可以聆听一名玩家在宇宙中的回音，便可知晓这名玩家的身份好坏。' }
            ], ensure_ascii=False), None),
            ('太阳雲', '温柔坚定的小雲，会带走伤害大家的坏人，默默离开，光芒依旧。', '逆光前行', '神职阵营', '猎人', 'gold', json.dumps([
                { 'title': '逆光前行', 'content': '若你在白天被投票出局或者是被拳击出局，可立即指定一名玩家，将其一同带走。' }
            ], ensure_ascii=False), None),
            ('玫瑰雲', '来自玫瑰星系的小雲，会用玫瑰星云做出绚丽雀跃或肆意翻涌的药剂。', '雀跃之风, 消逝印记', '神职阵营', '女巫', 'gold', json.dumps([
                { 'title': '雀跃之风 (药剂)', 'content': '夜晚可以选择救回一名当晚遭到“拳击”即将出局的玩家。\n由于风也会吹去尘埃，若被救玩家已被守卫守护，该玩家仍将出局（同守同救失效）。\n一次性技能，不能与”消逝印记“同一晚使用。' },
                { 'title': '消逝印记 (毒药)', 'content': '夜晚可以选择一名玩家标下印记，让其在第二天白天出局。\n命定的轨迹无法收到星尘干涉，你的印记无视守护（可击穿守卫盾）。\n一次性技能，不能与”雀跃之风“同一晚使用。' }
            ], ensure_ascii=False), None),
            ('烟火雲', '曾经在过去受到伤害的她，现在想要保护其他小雲。', '星尘弥合', '神职阵营', '守卫', 'gold', json.dumps([
                { 'title': '星尘弥合', 'content': '夜晚可以选择一名玩家，该玩家将被烟火尘埃弥漫守护，可以免受 “拳击”的伤害，也可以不进行选择，但不能连续两晚选择同一玩家。' }
            ], ensure_ascii=False), None),
            ('盲选雲', '被魔星们从人海里找出来的小雲，她曾迷茫于来路与理想，但现在已坚定了方向。', '盲选, 遇从前', '坏人阵营', '机械狼', 'red', json.dumps([
                { 'title': '盲选 (学习)', 'content': '可且仅可在某夜选择一名玩家，学习其身份并获得对应的能力，此后将以该状态继续存在，可在夜间使用相应技能，并被查验时也是所学身份。\n- 学习“回响雲”、“太阳雲”、“魔星”：玩法对应相同。\n- 学习“玫瑰雲”：可使用一次“消逝印记”。\n- 学习“烟火雲”：可使用“星尘弥合”，且若该玩家被标下“消逝印记”，可继续存活。\n- 学习“阿鬼”：在触发“遇从前”当晚，可再次使用“给你一拳”，若对同一玩家使用，则无视“星尘弥合”、“雀跃之风”，该玩家必定出局。' },
                { 'title': '遇从前 (被动)', 'content': '当阿鬼全部出局时，盲选雲变为带刀状态，获得技能“给你一拳”。' },
                { 'title': '盲选局查验效果', 'content': '【3 个阿鬼】出局后，获得1 次【给你两拳】（当晚可拳击一人两次）。' }
            ], ensure_ascii=False), None),
            ('回响雲', '走过漫长来路的小雲，跌跌撞撞的她以泪水拨动星弦，所有的念念不忘，终于迎来了回响。', '弦上生花', '神职阵营', '通灵师', 'gold', json.dumps([
                { 'title': '弦上生花', 'content': '每晚可查验 1 名玩家的【具体身份】（直接显示角色名）。\n- 【盲选雲】未学习技能前（首夜），查验结果显示：【盲选雲】（坏人实锤）。\n- 【盲选雲】学习技能后，查验结果显示：其学到的目标身份。' }
            ], ensure_ascii=False), None)
        ]
        
        cursor.executemany(
            'INSERT INTO roles (name, desc, skill, camp, identity, color, skillDetails, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            default_roles
        )
        print("✅ 已初始化默认角色数据")

    conn.commit()
    conn.close()
