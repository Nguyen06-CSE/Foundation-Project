// frontend/digital-library/src/pages/group/components/tabs/SettingsTab.tsx

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { SettingsTabProps } from "../../types/groupSpace.types";

export default function SettingsTab({
  groupName,
  members,
  onDissolve,
  avatarUrl,
  coverUrl,
  onUpdateAvatar,
  onUpdateCover,
}: SettingsTabProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl || "");
  const [currentCover, setCurrentCover] = useState(coverUrl || "");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh (PNG, JPG, WEBP...)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCurrentAvatar(dataUrl);
      onUpdateAvatar?.(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh (PNG, JPG, WEBP...)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCurrentCover(dataUrl);
      onUpdateCover?.(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Card: Thông tin cơ bản */}
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Thông tin nhóm</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên nhóm</label>
            <Input defaultValue={groupName} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả nhóm</label>
            <textarea
              className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600"
              defaultValue="Không gian học tập chung của nhóm."
            />
          </div>
          <div className="flex justify-end">
            <Button>Lưu thông tin</Button>
          </div>
        </Card>

        {/* Card: Hình ảnh & Giao diện nhóm (Đổi ảnh đại diện & Đổi ảnh nền) */}
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Hình ảnh nhóm
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Tùy chỉnh ảnh đại diện và ảnh nền (cover) để nhận diện nhóm dễ dàng hơn
            </p>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <input
            type="file"
            ref={coverInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />

          {/* Mục 1: Đổi ảnh đại diện nhóm */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Ảnh đại diện nhóm
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => avatarInputRef.current?.click()}
                title="Nhấn để đổi ảnh đại diện nhóm"
                className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-primary-200 bg-primary-100 shadow-sm transition-all hover:scale-105 hover:border-primary-500"
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Ảnh đại diện nhóm"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Users className="h-10 w-10 text-primary-600" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-2xs">
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px] font-semibold mt-0.5">Đổi ảnh</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    icon={<Camera className="h-4 w-4" />}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Tải ảnh đại diện từ máy
                  </Button>
                  {currentAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCurrentAvatar("");
                        onUpdateAvatar?.("");
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Gỡ ảnh
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Hỗ trợ JPG, PNG, WEBP. Tỉ lệ vuông 1:1 tốt nhất.
                </p>
              </div>
            </div>
          </div>

          {/* Mục 2: Đổi ảnh nền nhóm */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Ảnh nền (Cover) nhóm
            </label>
            <div className="space-y-3">
              <div
                onClick={() => coverInputRef.current?.click()}
                title="Nhấn để đổi ảnh nền nhóm"
                className="group relative h-36 w-full cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-r from-primary-600 to-indigo-700 shadow-inner flex items-center justify-center transition-all hover:opacity-95"
              >
                {currentCover ? (
                  <img
                    src={currentCover}
                    alt="Ảnh nền nhóm"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/80">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs font-medium">Chưa có ảnh nền tùy chỉnh</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-2xs">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold shadow-md">
                    <Camera className="h-4 w-4" />
                    <span>Nhấn để đổi ảnh nền từ máy</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  icon={<ImageIcon className="h-4 w-4" />}
                  onClick={() => coverInputRef.current?.click()}
                >
                  Tải ảnh nền từ máy
                </Button>
                {currentCover && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCurrentCover("");
                      onUpdateCover?.("");
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Gỡ ảnh nền về mặc định
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Khu vực nguy hiểm */}
      <Card className="h-fit space-y-4 border-red-100 bg-red-50/30">
        <h2 className="text-lg font-semibold text-red-600">
          Khu vực nguy hiểm
        </h2>
        <p className="text-sm text-gray-600">
          Giải tán nhóm sẽ thông báo cho thành viên trước 24h. Tài liệu chưa
          được lưu về cá nhân có thể chuyển sang vùng orphaned.
        </p>
        <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm">
          {members
            .filter((member) => !member.is_owner)
            .map((member) => (
              <option key={member.user_id}>
                {member.full_name || member.username}
              </option>
            ))}
        </select>
        <Button variant="danger" onClick={() => void onDissolve()}>
          Giải tán nhóm
        </Button>
      </Card>
    </div>
  );
}
