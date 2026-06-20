import asyncio
import httpx

APP_ID = "cli_aabc1622d7781bda"
APP_SECRET = "lpSYTUHh3ul727WzGL73vbxDHpgCR1Vx"
APP_TOKEN = "ZDyEbqkZ9aHJ5FsOh99cHYGanae"
TABLE_ID = "tblDVahNEKeje5Vi"

FIELDS = [
    {"field_name": "商品标题", "type": 1},     # 1 = 多行文本
    {"field_name": "原价", "type": 2},          # 2 = 数字
    {"field_name": "最终售价", "type": 2},      # 数字
    {"field_name": "利润率", "type": 1},        # 文本
    {"field_name": "AI推荐标题", "type": 1},    # 文本
    {"field_name": "状态", "type": 1},          # 文本
]

async def setup():
    async with httpx.AsyncClient(timeout=15) as c:
        # 获取 token
        r = await c.post(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            json={"app_id": APP_ID, "app_secret": APP_SECRET},
        )
        token = r.json()["tenant_access_token"]
        print(f"Token OK")

        # 逐个创建字段
        for field in FIELDS:
            r2 = await c.post(
                f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/fields",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=field,
            )
            result = r2.json()
            if result.get("code") == 0:
                print(f"  [OK] {field['field_name']}")
            else:
                print(f"  [SKIP] {field['field_name']}: {result.get('msg', '')}")

        # 写入一条测试数据
        r3 = await c.post(
            f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"fields": {
                "商品标题": "测试商品",
                "原价": 9.99,
                "最终售价": 15.48,
                "利润率": "55.0%",
                "AI推荐标题": "Test Title",
                "状态": "AI 已完成",
            }},
        )
        print(f"\n写入测试: {r3.status_code} {r3.text[:200]}")

asyncio.run(setup())
