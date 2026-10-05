import asyncio
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.user import User

# Danh sách user cần sửa: username/email → password plain text
USERS_TO_FIX = [
    {"username": "sysadmin", "password": "hash123"},
    {"username": "schooladmin", "password": "hash123"},
    {"username": "admin_cntt", "password": "hash123"},
    {"username": "gv_tuan", "password": "hash123"},
    {"username": "gv_mai", "password": "hash123"},
    {"username": "sv_an", "password": "hash123"},
    {"username": "sv_binh", "password": "hash123"},
    {"username": "sv_cuong", "password": "hash123"},
    {"username": "sv_dung", "password": "hash123"},
    # Thêm các user khác nếu có
]

async def fix_passwords():
    async with AsyncSessionLocal() as session:
        for item in USERS_TO_FIX:
            result = await session.execute(
                select(User).where(User.username == item["username"])
            )
            user = result.scalar_one_or_none()
            
            if user:
                user.password_hash = hash_password(item["password"])
                print(f"✅ Đã hash password cho user: {user.username}")
            else:
                print(f"❌ Không tìm thấy user: {item['username']}")
        
        await session.commit()
        print("🎉 Hoàn tất cập nhật password!")

async def main():
    await fix_passwords()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())