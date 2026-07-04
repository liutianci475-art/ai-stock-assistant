"""Day 2 验收脚本：规则筛选 → 批量 AI 分析 → Top 推荐 JSON"""

import app.config  # noqa: F401

from app.services.recommend_service import main

if __name__ == "__main__":
    main()
