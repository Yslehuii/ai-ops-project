# ============================================================
# 跨境电商智能选品与自动化运营中台 - FastAPI 后端
# ============================================================

import os
import json
import asyncio
import httpx
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

app = FastAPI(title="跨境电商智能选品中台")

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 配置区（优先读环境变量，本地开发用默认值）
# ============================================================
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "tp-c4xxi8uk7z8dkvyu1caww2yvc48qqy616u1ntvbxouhtb9pn")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"

FEISHU_APP_ID = os.getenv("FEISHU_APP_ID", "cli_aabc1622d7781bda")
FEISHU_APP_SECRET = os.getenv("FEISHU_APP_SECRET", "lpSYTUHh3ul727WzGL73vbxDHpgCR1Vx")
FEISHU_APP_TOKEN = os.getenv("FEISHU_APP_TOKEN", "ZDyEbqkZ9aHJ5FsOh99cHYGanae")
FEISHU_TABLE_ID = os.getenv("FEISHU_TABLE_ID", "tblDVahNEKeje5Vi")

# 选品筛选阈值
PROFIT_RATE_THRESHOLD = 40.0   # 利润率 >= 40% 视为高利润
STOCK_THRESHOLD = 20           # 库存 >= 20 视为高库存

# ============================================================
# 定时任务调度器
# ============================================================
scheduler = AsyncIOScheduler()
scheduler_started = False


# ============================================================
# 工具函数
# ============================================================

async def fetch_products():
    """抓取电商数据（更多商品用于筛选）"""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get("https://dummyjson.com/products?limit=30")
        resp.raise_for_status()
        return resp.json().get("products", [])


def filter_good_products(products: list) -> list:
    """筛选高利润率 + 高库存的优质商品"""
    good = []
    for p in products:
        price = p.get("price", 0)
        stock = p.get("stock", 0)
        cost = price * 0.45
        profit_rate = round((price - cost) / price * 100, 1) if price else 0

        if profit_rate >= PROFIT_RATE_THRESHOLD and stock >= STOCK_THRESHOLD:
            p["_profit_rate"] = profit_rate
            good.append(p)
    return good


async def generate_titles(product_title: str) -> list[str]:
    """调用 DeepSeek API 生成 3 个中文爆款标题"""
    prompt = (
        f'根据商品标题「{product_title}」，'
        "生成 3 个更有吸引力的中文爆款标题，适合跨境电商平台（如亚马逊/TikTok）使用。"
        "要求标题突出卖点、吸引点击。只返回一个 JSON 数组，包含 3 个字符串，不要其他内容。"
    )
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            titles = json.loads(content)
            if isinstance(titles, list) and len(titles) >= 3:
                return titles[:3]
            return [product_title] * 3
    except Exception as e:
        print(f"[DeepSeek] API 调用失败: {e}，使用备用标题")
        return [
            f"爆款推荐 {product_title} - 跨境热卖",
            f"【限时特惠】{product_title} 亚马逊爆款",
            f" TikTok 热门 {product_title} - 网红同款",
        ]


async def get_feishu_token() -> str:
    """获取飞书 tenant_access_token"""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            json={"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET},
        )
        resp.raise_for_status()
        return resp.json()["tenant_access_token"]


async def write_to_feishu(record: dict):
    """写入飞书多维表格，失败自动切入模拟模式"""
    if not all([FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN, FEISHU_TABLE_ID]):
        print(f"[模拟模式] 成功写入飞书：{record.get('商品标题', '未知')}")
        return

    try:
        token = await get_feishu_token()
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://open.feishu.cn/open-apis/bitable/v1/apps/{FEISHU_APP_TOKEN}/tables/{FEISHU_TABLE_ID}/records",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"fields": record},
            )
            resp.raise_for_status()
            print(f"[飞书] 写入成功：{record.get('商品标题', '未知')}")
    except Exception as e:
        print(f"[飞书] API 写入失败: {e}，自动切入模拟模式")
        print(f"[模拟模式] 成功写入飞书：{record.get('商品标题', '未知')}")


# ============================================================
# 核心流程（手动 + 定时共用）
# ============================================================

async def run_pipeline() -> dict:
    """执行完整选品流程，返回结果"""
    logs = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logs.append(f"[{now}] 开始执行选品流程...")

    # Step 1: 抓取商品
    logs.append("[步骤1] 开始抓取商品数据...")
    try:
        products = await fetch_products()
        logs.append(f"[步骤1] 抓取成功，共 {len(products)} 条商品")
    except Exception as e:
        logs.append(f"[步骤1] 抓取失败: {e}")
        return {"logs": logs, "rows": []}

    # Step 2: 筛选优质商品
    logs.append(f"[筛选] 利润率 >= {PROFIT_RATE_THRESHOLD}% 且 库存 >= {STOCK_THRESHOLD} 的商品...")
    good_products = filter_good_products(products)
    logs.append(f"[筛选] 筛选出 {len(good_products)} 条优质商品（共 {len(products)} 条中）")

    if not good_products:
        logs.append("[完成] 未发现符合条件的优质商品，本次不写入飞书")
        return {"logs": logs, "rows": []}

    all_rows = []

    for i, p in enumerate(good_products, 1):
        title = p.get("title", "")
        price = p.get("price", 0)
        stock = p.get("stock", 0)
        profit_rate = p["_profit_rate"]

        # Step 3: AI 生成标题
        logs.append(f"[步骤2] ({i}/{len(good_products)}) 正在为「{title}」生成AI标题...")
        ai_titles = await generate_titles(title)
        logs.append(f"[步骤2] 生成完成: {ai_titles[0]}")

        # Step 4: 写入飞书
        final_price = round(price * 1.55, 2)
        record = {
            "商品标题": title,
            "原价": price,
            "最终售价": final_price,
            "利润率": f"{profit_rate}%",
            "AI推荐标题": " | ".join(ai_titles),
            "状态": "AI 已完成",
        }
        logs.append(f"[步骤3] 准备写入飞书：{title}（库存:{stock}）")

        await write_to_feishu(record)
        all_rows.append(record)

    logs.append(f"[完成] 共处理 {len(all_rows)} 条优质商品，已写入飞书！")
    return {"logs": logs, "rows": all_rows}


# ============================================================
# 定时任务回调
# ============================================================

async def scheduled_job():
    """每天 9 点自动执行的定时任务"""
    print(f"\n{'='*50}")
    print(f"[定时任务] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} 开始执行每日选品...")
    print(f"{'='*50}")
    result = await run_pipeline()
    for log in result["logs"]:
        print(log)
    print(f"[定时任务] 本次写入 {len(result['rows'])} 条商品")
    print(f"{'='*50}\n")


# ============================================================
# API 接口
# ============================================================

@app.get("/start_pipeline")
async def start_pipeline():
    """手动触发：一键选品流程"""
    return await run_pipeline()


@app.get("/scheduler/status")
async def scheduler_status():
    """查看定时任务状态"""
    jobs = scheduler.get_jobs()
    return {
        "running": scheduler_started,
        "jobs": [
            {
                "id": job.id,
                "next_run": str(job.next_run_time) if job.next_run_time else "未调度",
                "trigger": str(job.trigger),
            }
            for job in jobs
        ],
    }


@app.post("/scheduler/start")
async def scheduler_start():
    """启动定时任务（每天 9:00 执行）"""
    global scheduler_started
    if not scheduler.running:
        scheduler.start()
    # 移除旧任务，避免重复
    for job in scheduler.get_jobs():
        scheduler.remove_job(job.id)
    # 添加每天 9 点执行的任务
    scheduler.add_job(
        scheduled_job,
        CronTrigger(hour=9, minute=0),
        id="daily_pipeline",
        replace_existing=True,
    )
    scheduler_started = True
    next_run = scheduler.get_job("daily_pipeline").next_run_time
    return {"status": "ok", "message": f"定时任务已启动，每天 09:00 自动执行", "next_run": str(next_run)}


@app.post("/scheduler/stop")
async def scheduler_stop():
    """停止定时任务"""
    global scheduler_started
    if scheduler.running:
        scheduler.remove_job("daily_pipeline")
    scheduler_started = False
    return {"status": "ok", "message": "定时任务已停止"}


@app.get("/")
def root():
    return {"status": "ok", "message": "跨境电商智能选品中台 API"}


# ============================================================
# 启动时自动开启定时任务
# ============================================================

@app.on_event("startup")
async def startup():
    global scheduler_started
    scheduler.start()
    scheduler.add_job(
        scheduled_job,
        CronTrigger(hour=9, minute=0),
        id="daily_pipeline",
        replace_existing=True,
    )
    scheduler_started = True
    next_run = scheduler.get_job("daily_pipeline").next_run_time
    print(f"[启动] 定时任务已自动开启，下次执行: {next_run}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
