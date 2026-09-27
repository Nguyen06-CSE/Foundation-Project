// frontend/digital-library/src/pages/library/admin/LibraryAdmin.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, FolderTree } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore'; // Dùng useAuthStore

export const LibraryAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const userRole = (user?.role || '').toLowerCase().trim();
  const isSystemAdmin = ['sysadmin', 'schooladmin', 'system_admin', 'school_admin'].includes(userRole);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý kho học liệu</h1>
        <p className="text-gray-500 text-sm">Quản lý duyệt đóng góp và cấu trúc Khoa / Môn học</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => navigate('/library/admin/submissions')}
          className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-500 hover:shadow-md transition cursor-pointer space-y-3"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Duyệt tài liệu đóng góp</h2>
          <p className="text-sm text-gray-500">Xem và xử lý các yêu cầu đóng góp tài liệu từ người dùng.</p>
        </div>

        <div 
          onClick={() => navigate('/library/admin/structure')}
          className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-500 hover:shadow-md transition cursor-pointer space-y-3"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <FolderTree className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Quản lý Khoa & Môn học</h2>
          <p className="text-sm text-gray-500">
            {isSystemAdmin 
              ? 'Thêm mới Khoa, tạo/sửa/xóa các Môn học thuộc các Khoa.' 
              : 'Thêm mới, sửa hoặc xóa các Môn học thuộc Khoa bạn quản lý.'}
          </p>
        </div>
      </div>
    </div>
  );
};