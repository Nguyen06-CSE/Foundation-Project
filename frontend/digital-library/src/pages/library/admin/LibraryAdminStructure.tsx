// frontend/digital-library/src/pages/library/admin/LibraryAdminStructure.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, BookOpen, GraduationCap } from 'lucide-react';
import { libraryService } from '@/services/libraryService';
import { useAuthStore } from '@/stores/authStore'; 
import type { Faculty, Subject } from '@/types/library';

export const LibraryAdminStructure: React.FC = () => {
  const { user } = useAuthStore();

  const userRole = (user?.role || '').toLowerCase().trim();
  const isSystemAdmin = ['sysadmin', 'schooladmin', 'system_admin', 'school_admin'].includes(userRole);

  // LẤY MÃ KHOA TỪ PREFIX EMAIL (VD: "cntt@school.edu.vn" -> "cntt")
  const assignedFacultyCode = user?.email 
    ? user.email.split('@')[0].toLowerCase().trim() 
    : '';

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false);

  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [facultyForm, setFacultyForm] = useState({ code: '', name: '', description: '' });
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', description: '' });

  const loadFaculties = async () => {
    try {
      const data = await libraryService.getFaculties();
      setFaculties(data);

      if (isSystemAdmin) {
        if (data.length > 0 && !selectedFaculty) setSelectedFaculty(data[0]);
      } else if (userRole === 'faculty_admin' && assignedFacultyCode) {
        // Tự động tìm và chọn Khoa theo prefix email (ví dụ: "cntt")
        const myFaculty = data.find((f: Faculty) => f.code.toLowerCase().trim() === assignedFacultyCode);
        if (myFaculty) setSelectedFaculty(myFaculty);
      }
    } catch (err) {
      console.error('Lỗi khi tải Khoa', err);
    }
  };

  useEffect(() => {
    loadFaculties();
  }, [userRole, user?.email]);

  useEffect(() => {
    if (!selectedFaculty) return;
    setLoadingSubjects(true);
    libraryService.getSubjects(selectedFaculty.id)
      .then(data => setSubjects(data))
      .catch(err => console.error('Lỗi khi tải Môn học', err))
      .finally(() => setLoadingSubjects(false));
  }, [selectedFaculty]);

  // Điều kiện được phép Sửa / Xóa Môn học trên Khoa đang chọn
  const canManageSelectedFaculty = isSystemAdmin || (
    selectedFaculty ? selectedFaculty.code.toLowerCase().trim() === assignedFacultyCode : false
  );

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await libraryService.createFaculty(facultyForm);
      setShowFacultyModal(false);
      setFacultyForm({ code: '', name: '', description: '' });
      loadFaculties();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi tạo Khoa');
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;

    try {
      if (editingSubject) {
        await libraryService.updateSubject(editingSubject.id, subjectForm);
      } else {
        await libraryService.createSubject({ ...subjectForm, faculty_id: selectedFaculty.id });
      }
      setShowSubjectModal(false);
      setEditingSubject(null);
      setSubjectForm({ code: '', name: '', description: '' });

      const updated = await libraryService.getSubjects(selectedFaculty.id);
      setSubjects(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi lưu Môn học');
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa môn học này?')) return;
    try {
      await libraryService.deleteSubject(subjectId);
      setSubjects(subjects.filter(s => s.id !== subjectId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi xóa Môn học');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Khoa & Môn học</h1>
          <p className="text-gray-500 text-sm">
            Tài khoản: <span className="font-semibold text-primary-600">{user?.full_name} ({user?.email})</span>
          </p>
        </div>
        {isSystemAdmin && (
          <button 
            onClick={() => setShowFacultyModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
          >
            <Plus className="w-4 h-4" /> Thêm Khoa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Danh sách Khoa */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Danh sách Khoa</h3>
          <div className="space-y-1">
            {faculties.map((f) => {
              const facultyCode = f.code.toLowerCase().trim();
              const canAccess = isSystemAdmin || facultyCode === assignedFacultyCode;

              return (
                <button
                  key={f.id}
                  disabled={!canAccess}
                  onClick={() => setSelectedFaculty(f)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition ${
                    selectedFaculty?.id === f.id 
                      ? 'bg-primary-50 text-primary-700 font-medium border-l-4 border-primary-600' 
                      : canAccess 
                        ? 'hover:bg-gray-50 text-gray-700 cursor-pointer' 
                        : 'opacity-40 cursor-not-allowed text-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    {f.name}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{f.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Danh sách Môn học */}
        <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {selectedFaculty ? (
            <>
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedFaculty.name}</h2>
                  <p className="text-xs text-gray-500">Mã khoa: {selectedFaculty.code}</p>
                </div>
                {canManageSelectedFaculty && (
                  <button
                    onClick={() => {
                      setEditingSubject(null);
                      setSubjectForm({ code: '', name: '', description: '' });
                      setShowSubjectModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                  >
                    <Plus className="w-4 h-4" /> Thêm Môn học
                  </button>
                )}
              </div>

              {loadingSubjects ? (
                <p className="text-center py-8 text-gray-400 text-sm">Đang tải môn học...</p>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>Chưa có môn học nào thuộc khoa này.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-gray-400 font-medium">
                        <th className="pb-3">Mã môn</th>
                        <th className="pb-3">Tên môn học</th>
                        <th className="pb-3">Mô tả</th>
                        {canManageSelectedFaculty && <th className="pb-3 text-right">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subjects.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-semibold text-gray-700">{sub.code}</td>
                          <td className="py-3 text-gray-900">{sub.name}</td>
                          <td className="py-3 text-gray-500 max-w-xs truncate">{sub.description || '—'}</td>
                          {canManageSelectedFaculty && (
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingSubject(sub);
                                  setSubjectForm({ code: sub.code, name: sub.name, description: sub.description || '' });
                                  setShowSubjectModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(sub.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-12 text-gray-400">Vui lòng chọn một Khoa để xem danh sách môn học.</p>
          )}
        </div>
      </div>

      {/* Modal Thêm Khoa */}
      {showFacultyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateFaculty} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Thêm Khoa mới</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mã Khoa (viết tắt)</label>
              <input
                required
                placeholder="VD: cntt"
                value={facultyForm.code}
                onChange={e => setFacultyForm({ ...facultyForm, code: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên Khoa</label>
              <input
                required
                placeholder="VD: Khoa Công nghệ thông tin"
                value={facultyForm.name}
                onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={facultyForm.description}
                onChange={e => setFacultyForm({ ...facultyForm, description: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowFacultyModal(false)} className="px-4 py-2 text-sm text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg">Tạo Khoa</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Thêm/Sửa Môn học */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSubject} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">{editingSubject ? 'Sửa Môn học' : 'Thêm Môn học mới'}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mã Môn học</label>
              <input
                required
                placeholder="VD: CSDL"
                value={subjectForm.code}
                onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên Môn học</label>
              <input
                required
                placeholder="VD: Cơ sở dữ liệu"
                value={subjectForm.name}
                onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={subjectForm.description}
                onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowSubjectModal(false)} className="px-4 py-2 text-sm text-gray-600">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg">
                {editingSubject ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};