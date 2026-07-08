"""SQLite 数据库连接与建表"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "ai_stock.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate_recommendation(conn: sqlite3.Connection) -> None:
    for col, default in [
        ("target_price", "0.0"),
        ("stop_loss_price", "0.0"),
        ("agent_details_json", "'[]'"),
        ("prompt_tokens", "0"),
        ("completion_tokens", "0"),
        ("total_tokens", "0"),
        ("cost_rmb", "0.0"),
    ]:
        try:
            conn.execute(f"ALTER TABLE recommendation ADD COLUMN {col} TEXT DEFAULT {default}")
        except sqlite3.OperationalError:
            pass


def _migrate_holdings(conn: sqlite3.Connection) -> None:
    try:
        conn.execute("ALTER TABLE holdings ADD COLUMN sell_price REAL DEFAULT 0.0")
    except sqlite3.OperationalError:
        pass


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS stock (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            market TEXT DEFAULT '',
            industry TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            analysis_date TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 1,
            action TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            indicators_json TEXT DEFAULT '',
            news_summary TEXT DEFAULT '',
            model TEXT DEFAULT '',
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            cost_rmb REAL DEFAULT 0.0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS recommendation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recommend_date TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT DEFAULT '',
            rank INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 1,
            action TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            rule_score INTEGER DEFAULT 0,
            news_count INTEGER DEFAULT 0,
            close_price REAL DEFAULT 0.0,
            analysis_id INTEGER,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (analysis_id) REFERENCES analysis(id)
        );

        CREATE TABLE IF NOT EXISTS holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            buy_date TEXT NOT NULL,
            buy_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            current_price REAL DEFAULT 0.0,
            stop_loss REAL DEFAULT 0.0,
            take_profit REAL DEFAULT 0.0,
            ai_score_at_buy INTEGER DEFAULT 0,
            buy_reason TEXT DEFAULT '',
            status TEXT DEFAULT 'holding',
            sell_price REAL DEFAULT 0.0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            holding_id INTEGER,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            trade_date TEXT NOT NULL,
            trade_type TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            reason TEXT DEFAULT '',
            pnl REAL DEFAULT 0.0,
            pnl_pct REAL DEFAULT 0.0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (holding_id) REFERENCES holdings(id)
        );

        CREATE TABLE IF NOT EXISTS daily_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            holding_id INTEGER,
            code TEXT NOT NULL,
            review_date TEXT NOT NULL,
            action TEXT DEFAULT '',
            score INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 1,
            reason TEXT DEFAULT '',
            current_price REAL DEFAULT 0.0,
            pnl_pct REAL DEFAULT 0.0,
            token_usage TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (holding_id) REFERENCES holdings(id)
        );
        """)
        _migrate_recommendation(conn)
        _migrate_holdings(conn)
        conn.commit()
    finally:
        conn.close()
