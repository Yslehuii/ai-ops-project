import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            json={"app_id": "cli_aabc1622d7781bda", "app_secret": "lpSYTUHh3ul727WzGL73vbxDHpgCR1Vx"},
        )
        token = r.json()["tenant_access_token"]
        print(f"Token: {token[:20]}...")

        r2 = await c.post(
            "https://open.feishu.cn/open-apis/bitable/v1/apps/ZDyEbqkZ9aHJ5FsOh99cHYGanae/tables/tblDVahNEKeje5Vi/records",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"fields": {"商品标题": "测试商品", "原价": 9.99, "最终售价": 15.48, "利润率": "55%", "AI推荐标题": "Test Title", "状态": "AI 已完成"}},
        )
        print(f"Status: {r2.status_code}")
        print(f"Response: {r2.text[:500]}")

asyncio.run(test())
