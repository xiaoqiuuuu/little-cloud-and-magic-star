from .config import get_connection
from datetime import datetime, timedelta

def add_visit(ip_address: str, referrer: str, user_agent: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO page_visits (ip_address, referrer, user_agent) VALUES (?, ?, ?)",
        (ip_address, referrer, user_agent)
    )
    conn.commit()
    conn.close()

def get_visit_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Total visits
    cursor.execute("SELECT COUNT(*) FROM page_visits")
    total = cursor.fetchone()[0]
    
    # Daily visits (last 30 days)
    cursor.execute("""
        SELECT strftime('%Y-%m-%d', visit_time) as date, COUNT(*) 
        FROM page_visits 
        WHERE visit_time > date('now', '-30 days')
        GROUP BY date
        ORDER BY date ASC
    """)
    daily = [{"date": row[0], "count": row[1]} for row in cursor.fetchall()]
    
    # Referrer stats (Top 10)
    cursor.execute("""
        SELECT referrer, COUNT(*) 
        FROM page_visits 
        GROUP BY referrer 
        ORDER BY COUNT(*) DESC 
        LIMIT 10
    """)
    sources = []
    for row in cursor.fetchall():
        ref = row[0] if row[0] else "Direct/None"
        sources.append({"name": ref, "value": row[1]})

    conn.close()
    
    return {
        "total": total,
        "daily": daily,
        "sources": sources
    }
