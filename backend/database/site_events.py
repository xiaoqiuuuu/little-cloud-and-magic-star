"""官网活动的数据访问层。"""

import json
import sqlite3
from typing import Any, Dict, List, Optional

from .config import get_connection


DEFAULT_SITE_EVENT = {
    "slug": "xiaoyunsha-2-shenzhen-2026",
    "name": "小雲殺 2.0 · 深圳收官站",
    "date_label": "2026 年 1 月",
    "location": "深圳",
    "content": {
        "eyebrow": "肥音卤果创意者联盟 · 深圳无料",
        "title": "肥音卤果创意者联盟\n深圳无料——桌游上新",
        "intro_title": "万众期待 - 小雲殺2.0 无料介绍",
        "intro": "《小雲殺》是一款以推理与社交博弈为核心的阵营互动类桌游。玩家将在游戏中随机扮演不同角色，在隐藏身份的状态下，通过发言、推理与技能行动，争取让自己的阵营取得最终胜利。",
        "rules": {
            "enabled": True,
            "title": "游戏玩法与规则",
            "description": "了解面包雲、阿鬼等12位角色的独特技能，掌握6-12人局的完整游戏流程。",
            "link": "/rules",
            "link_label": "点击查看",
            "icons": ["🌙", "☀️", "🎭"],
        },
        "materials_title": "精彩物料一览",
        "materials": [
            {
                "title": "角色卡牌",
                "description": "本次角色卡共计10种角色/13张卡牌，不同于1.0的选材，2.0选择用铜版纸+磨砂卡套的设计，更加注重实际桌游的游玩体验。",
                "image": "/juesepai.jpg",
                "icon": "🃏",
                "color": "rose",
            },
            {
                "title": "数字卡牌",
                "description": "新增13张数字牌，更方便玩家线下游玩。",
                "image": "/shuzipai.jpg",
                "icon": "🔢",
                "color": "pink",
            },
            {
                "title": "亚克力警徽",
                "description": "新增特殊游戏配件：亚克力警徽",
                "image": "/yakelijinghui.jpg",
                "icon": "🛡️",
                "color": "yellow",
            },
            {
                "title": "说明书",
                "description": "提供游戏介绍、人物介绍、玩法简介等内容。方便魔星们更快上手《小雲殺》。",
                "image": "/shuomingshu.jpg",
                "icon": "📖",
                "color": "blue",
            },
            {
                "title": "收纳盒&收纳袋",
                "description": "方便魔星们更好的收藏、携带《小雲殺》。（要好好保护卡牌哦）",
                "image": "/hezishounadai.jpg",
                "icon": "📦",
                "color": "indigo",
            },
        ],
        "cta": {
            "title": "🎉 获取方式",
            "description": "本次《小雲殺2.0》依旧采取线下答题以及线上抽奖两种形式获取。\n要好好复习面包的演唱会以及其他相关视频哦！\n（题库来源：演唱会、综艺、微博、Vlog）",
        },
        "footer": {
            "title": "⭐ 小雲殺2.0 ⭐",
            "copyright": "© 2026 版权所有 · 肥音卤果创意者联盟",
            "note": "黄霄雲2025「宇宙无敌号」巡演-深圳收官站 · 物料发放",
        },
        "theme": "aurora",
    },
}


def _row_to_event(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": int(row["id"]),
        "slug": row["slug"],
        "name": row["name"],
        "date_label": row["date_label"] or "",
        "location": row["location"] or "",
        "status": row["status"],
        "is_current": bool(row["is_current"]),
        "content": json.loads(row["content"]),
        "created_by": row["created_by"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "published_at": row["published_at"],
    }


def _summary(event: Dict[str, Any]) -> Dict[str, Any]:
    return {key: event[key] for key in (
        "id", "slug", "name", "date_label", "location", "status",
        "is_current", "created_at", "updated_at",
    )}


def _fetch_one(where: str, values=()) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            f"SELECT * FROM site_events WHERE {where} LIMIT 1",
            values,
        ).fetchone()
        return _row_to_event(row) if row else None
    finally:
        conn.close()


def list_site_events(*, public_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        where = "WHERE status IN ('published', 'archived')" if public_only else ""
        rows = conn.execute(
            f"""
            SELECT * FROM site_events
            {where}
            ORDER BY is_current DESC,
                CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
                updated_at DESC, id DESC
            """
        ).fetchall()
        events = [_row_to_event(row) for row in rows]
        return [_summary(event) for event in events] if public_only else events
    finally:
        conn.close()


def get_site_event(event_id: int) -> Optional[Dict[str, Any]]:
    return _fetch_one("id = ?", (event_id,))


def get_public_site_event(slug: str) -> Optional[Dict[str, Any]]:
    return _fetch_one(
        "slug = ? AND status IN ('published', 'archived')",
        (slug,),
    )


def get_current_site_event() -> Optional[Dict[str, Any]]:
    return _fetch_one(
        "is_current = 1 AND status = 'published'",
    )


def create_site_event(data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO site_events (
                slug, name, date_label, location, content, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                data["slug"],
                data["name"],
                data.get("date_label", ""),
                data.get("location", ""),
                json.dumps(data["content"], ensure_ascii=False),
                created_by,
            ),
        )
        event_id = int(cursor.lastrowid)
        conn.commit()
    finally:
        conn.close()
    return get_site_event(event_id)


def update_site_event(event_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    existing = get_site_event(event_id)
    if not existing:
        return None
    if (
        "slug" in updates
        and updates["slug"] != existing["slug"]
        and existing["status"] != "draft"
    ):
        raise ValueError("活动发布后不能修改固定网址标识")

    fields = []
    values = []
    for key in ("slug", "name", "date_label", "location"):
        if key in updates:
            fields.append(f"{key} = ?")
            values.append(updates[key])
    if "content" in updates:
        fields.append("content = ?")
        values.append(json.dumps(updates["content"], ensure_ascii=False))
    if not fields:
        return get_site_event(event_id)

    fields.append("updated_at = CURRENT_TIMESTAMP")
    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE site_events SET {', '.join(fields)} WHERE id = ?",
            values + [event_id],
        )
        conn.commit()
    finally:
        conn.close()
    return get_site_event(event_id)


def duplicate_site_event(event_id: int, created_by: str) -> Optional[Dict[str, Any]]:
    source = get_site_event(event_id)
    if not source:
        return None

    conn = get_connection()
    try:
        base_slug = f"{source['slug'][:75].rstrip('-')}-copy"
        slug = base_slug
        suffix = 2
        while conn.execute("SELECT 1 FROM site_events WHERE slug = ?", (slug,)).fetchone():
            suffix_text = f"-copy-{suffix}"
            slug = f"{source['slug'][:80 - len(suffix_text)].rstrip('-')}{suffix_text}"
            suffix += 1
        cursor = conn.execute(
            """
            INSERT INTO site_events (
                slug, name, date_label, location, content, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                slug,
                f"{source['name'][:96]}（副本）",
                source["date_label"],
                source["location"],
                json.dumps(source["content"], ensure_ascii=False),
                created_by,
            ),
        )
        duplicated_id = int(cursor.lastrowid)
        conn.commit()
    finally:
        conn.close()
    return get_site_event(duplicated_id)


def activate_site_event(event_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        if not conn.execute("SELECT 1 FROM site_events WHERE id = ?", (event_id,)).fetchone():
            conn.rollback()
            return None
        conn.execute("UPDATE site_events SET is_current = 0 WHERE is_current = 1")
        conn.execute(
            """
            UPDATE site_events
            SET status = 'published', is_current = 1,
                published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (event_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return get_site_event(event_id)


def archive_site_event(event_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT status, is_current FROM site_events WHERE id = ?",
            (event_id,),
        ).fetchone()
        if not row:
            return None
        if row["status"] == "draft":
            raise ValueError("草稿活动不能归档")
        if row["is_current"]:
            raise ValueError("当前主页活动不能归档，请先切换到其他活动")
        cursor = conn.execute(
            """
            UPDATE site_events
            SET status = 'archived', is_current = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (event_id,),
        )
        conn.commit()
        if cursor.rowcount != 1:
            return None
    finally:
        conn.close()
    return get_site_event(event_id)


def delete_site_event(event_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM site_events WHERE id = ? AND status = 'draft'",
            (event_id,),
        )
        conn.commit()
        return cursor.rowcount == 1
    finally:
        conn.close()
