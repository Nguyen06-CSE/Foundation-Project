import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  User as UserIcon,
  Users,
  GraduationCap,
  Regex,
  Plus,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { userService } from "@/services/userService";
import { academicsService } from "@/services/academicsService";
import { useDebounce } from "@/hooks/useDebounce";
import type { User } from "@/types/user";

export type InviteMode = "basic" | "advanced";
export type SelectionType = "user" | "class" | "faculty" | "pattern";

export interface SelectedItem {
  id: string | number;
  type: SelectionType;
  label: string;
  subLabel?: string;
  value: any;
}

export interface RecipientPickerProps {
  mode: InviteMode;
  onModeChange: (mode: InviteMode) => void;
  selectedUsers: User[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<User[]>>;
  patterns: string[];
  setPatterns: React.Dispatch<React.SetStateAction<string[]>>;
  selectedClassIds: number[];
  setSelectedClassIds: React.Dispatch<React.SetStateAction<number[]>>;
  selectedFacultyIds: number[];
  setSelectedFacultyIds: React.Dispatch<React.SetStateAction<number[]>>;
  renderUserBadge?: (user: User) => React.ReactNode;
}

export function RecipientPicker({
  mode,
  onModeChange,
  selectedUsers,
  setSelectedUsers,
  patterns,
  setPatterns,
  selectedClassIds,
  setSelectedClassIds,
  selectedFacultyIds,
  setSelectedFacultyIds,
  renderUserBadge,
}: RecipientPickerProps) {
  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties"],
    queryFn: academicsService.getFaculties,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: academicsService.getClasses,
  });

  return (
    <div className="space-y-4">
      {/* SEGMENTED CONTROL */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => onModeChange("basic")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all ${
            mode === "basic"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Tìm kiếm nhanh
        </button>
        <button
          type="button"
          onClick={() => onModeChange("advanced")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all ${
            mode === "advanced"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Phân loại chi tiết (Lớp/Khoa/MSSV)
        </button>
      </div>

      {mode === "basic" ? (
        <BasicPickerForm
          faculties={faculties}
          classes={classes}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          patterns={patterns}
          setPatterns={setPatterns}
          selectedClassIds={selectedClassIds}
          setSelectedClassIds={setSelectedClassIds}
          selectedFacultyIds={selectedFacultyIds}
          setSelectedFacultyIds={setSelectedFacultyIds}
          renderUserBadge={renderUserBadge}
        />
      ) : (
        <AdvancedPickerForm
          faculties={faculties}
          classes={classes}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          patterns={patterns}
          setPatterns={setPatterns}
          selectedClassIds={selectedClassIds}
          setSelectedClassIds={setSelectedClassIds}
          selectedFacultyIds={selectedFacultyIds}
          setSelectedFacultyIds={setSelectedFacultyIds}
          renderUserBadge={renderUserBadge}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * 1. BASIC FORM
 * ============================================================================ */
interface SubFormProps {
  faculties: any[];
  classes: any[];
  selectedUsers: User[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<User[]>>;
  patterns: string[];
  setPatterns: React.Dispatch<React.SetStateAction<string[]>>;
  selectedClassIds: number[];
  setSelectedClassIds: React.Dispatch<React.SetStateAction<number[]>>;
  selectedFacultyIds: number[];
  setSelectedFacultyIds: React.Dispatch<React.SetStateAction<number[]>>;
  renderUserBadge?: (user: User) => React.ReactNode;
}

function BasicPickerForm({
  faculties,
  classes,
  selectedUsers,
  setSelectedUsers,
  patterns,
  setPatterns,
  selectedClassIds,
  setSelectedClassIds,
  selectedFacultyIds,
  setSelectedFacultyIds,
  renderUserBadge,
}: SubFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedTerm = useDebounce(inputValue.trim().toLowerCase(), 300);

  const { data: userSuggestions = [], isFetching } = useQuery({
    queryKey: ["user-search", debouncedTerm],
    queryFn: () => userService.searchUsers(debouncedTerm),
    enabled: debouncedTerm.length >= 2,
    staleTime: 1000 * 60,
  });

  const suggestions = useMemo<SelectedItem[]>(() => {
    if (!debouncedTerm || debouncedTerm.length < 1) return [];

    const results: SelectedItem[] = [];
    const term = debouncedTerm;

    if (term.length >= 2 && !patterns.includes(term)) {
      results.push({
        id: `pattern-${term}`,
        type: "pattern",
        label: `Mã SV chứa chuỗi "${term}"`,
        subLabel: "Quy tắc lọc theo Pattern",
        value: term,
      });
    }

    const matchedFaculties = faculties.filter(
      (f: any) =>
        f.name.toLowerCase().includes(term) ||
        f.code.toLowerCase().includes(term),
    );
    results.push(
      ...matchedFaculties
        .filter((f) => !selectedFacultyIds.includes(f.id))
        .map(
          (f: any): SelectedItem => ({
            id: `faculty-${f.id}`,
            type: "faculty",
            label: f.name,
            subLabel: `Khoa • ${f.code}`,
            value: f.id,
          }),
        ),
    );

    const matchedClasses = classes.filter(
      (c: any) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term),
    );
    results.push(
      ...matchedClasses
        .filter((c) => !selectedClassIds.includes(c.id))
        .map(
          (c: any): SelectedItem => ({
            id: `class-${c.id}`,
            type: "class",
            label: c.name,
            subLabel: `Lớp • ${c.code}`,
            value: c.id,
          }),
        ),
    );

    results.push(
      ...userSuggestions
        .filter((u: User) => !selectedUsers.some((sel) => sel.id === u.id))
        .map(
          (u: any): SelectedItem => ({
            id: `user-${u.id}`,
            type: "user",
            label: u.full_name || u.username,
            subLabel: u.student_code
              ? `${u.student_code} • ${u.email}`
              : u.email,
            value: u,
          }),
        ),
    );

    return results;
  }, [
    debouncedTerm,
    faculties,
    classes,
    userSuggestions,
    selectedUsers,
    selectedClassIds,
    selectedFacultyIds,
    patterns,
  ]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SelectedItem) => {
    switch (item.type) {
      case "pattern":
        setPatterns((p) => [...p, item.value]);
        break;
      case "faculty":
        setSelectedFacultyIds((p) => [...p, item.value]);
        break;
      case "class":
        setSelectedClassIds((p) => [...p, item.value]);
        break;
      case "user":
        setSelectedUsers((p) => [...p, item.value]);
        break;
    }
    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const getIcon = (type: SelectionType) => {
    switch (type) {
      case "faculty":
        return <Users className="h-3 w-3" />;
      case "class":
        return <GraduationCap className="h-3 w-3" />;
      case "pattern":
        return <Regex className="h-3 w-3" />;
      default:
        return <UserIcon className="h-3 w-3" />;
    }
  };

  const allChips = [
    ...selectedUsers.map((u) => ({
      id: `user-${u.id}`,
      type: "user" as const,
      label: u.full_name || u.username || u.email,
      user: u,
      onRemove: () => setSelectedUsers((p) => p.filter((x) => x.id !== u.id)),
    })),
    ...patterns.map((pat) => ({
      id: `pat-${pat}`,
      type: "pattern" as const,
      label: `Mã chứa: "${pat}"`,
      user: undefined,
      onRemove: () => setPatterns((p) => p.filter((x) => x !== pat)),
    })),
    ...selectedClassIds.map((id) => {
      const cls = classes.find((c) => c.id === id);
      return {
        id: `cls-${id}`,
        type: "class" as const,
        label: cls?.name || `Lớp #${id}`,
        user: undefined,
        onRemove: () => setSelectedClassIds((p) => p.filter((x) => x !== id)),
      };
    }),
    ...selectedFacultyIds.map((id) => {
      const fac = faculties.find((f) => f.id === id);
      return {
        id: `fac-${id}`,
        type: "faculty" as const,
        label: fac?.name || `Khoa #${id}`,
        user: undefined,
        onRemove: () => setSelectedFacultyIds((p) => p.filter((x) => x !== id)),
      };
    }),
  ];

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <div
          className="flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <Search className="h-4 w-4 text-gray-400 shrink-0 ml-1" />

          {allChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700"
            >
              {getIcon(chip.type)}
              <span>{chip.label}</span>
              {chip.user && renderUserBadge && renderUserBadge(chip.user)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  chip.onRemove();
                }}
                className="rounded-full p-0.5 hover:bg-primary-200/60 text-primary-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            className="flex-1 min-w-[140px] bg-transparent outline-none text-xs text-gray-900 placeholder:text-gray-400"
            placeholder={
              allChips.length === 0
                ? "Gõ tên người dùng, MSSV, tên Lớp, Khoa hoặc cụm ký tự..."
                : "Thêm người/tiêu chí khác..."
            }
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !inputValue && allChips.length > 0) {
                allChips[allChips.length - 1].onRemove();
              }
            }}
          />
        </div>

        {showDropdown && (debouncedTerm || isFetching) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
            {isFetching ? (
              <div className="p-3 text-center text-xs text-gray-500">
                Đang tìm kiếm gợi ý...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="py-1">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-full bg-gray-100 text-gray-600">
                        {getIcon(item.type)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {item.label}
                          {item.type === "user" && renderUserBadge && renderUserBadge(item.value)}
                        </div>
                        {item.subLabel && (
                          <div className="text-[10px] text-gray-400">
                            {item.subLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">
                Không tìm thấy kết quả phù hợp cho &quot;{debouncedTerm}&quot;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. ADVANCED FORM
 * ============================================================================ */
function AdvancedPickerForm({
  faculties,
  classes,
  selectedUsers,
  setSelectedUsers,
  patterns,
  setPatterns,
  selectedClassIds,
  setSelectedClassIds,
  selectedFacultyIds,
  setSelectedFacultyIds,
  renderUserBadge,
}: SubFormProps) {
  const [userInputValue, setUserInputValue] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [patternInput, setPatternInput] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

  const userInputRef = useRef<HTMLInputElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const facultyDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedUserTerm = useDebounce(userInputValue.trim().toLowerCase(), 300);

  const { data: userSuggestions = [], isFetching: isUserFetching } = useQuery({
    queryKey: ["user-search-adv", debouncedUserTerm],
    queryFn: () => userService.searchUsers(debouncedUserTerm),
    enabled: debouncedUserTerm.length >= 2,
    staleTime: 1000 * 60,
  });

  const availableUserSuggestions = useMemo(() => {
    return userSuggestions.filter(
      (u: User) => !selectedUsers.some((sel) => sel.id === u.id),
    );
  }, [userSuggestions, selectedUsers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
      if (
        classDropdownRef.current &&
        !classDropdownRef.current.contains(e.target as Node)
      ) {
        setShowClassDropdown(false);
      }
      if (
        facultyDropdownRef.current &&
        !facultyDropdownRef.current.contains(e.target as Node)
      ) {
        setShowFacultyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddPattern = () => {
    const trimmed = patternInput.trim();
    if (trimmed && !patterns.includes(trimmed)) {
      setPatterns((p) => [...p, trimmed]);
      setPatternInput("");
    }
  };

  const filteredFaculties = useMemo(() => {
    const term = facultySearch.trim().toLowerCase();
    return faculties.filter(
      (f: any) =>
        !selectedFacultyIds.includes(f.id) &&
        (f.name.toLowerCase().includes(term) ||
          f.code.toLowerCase().includes(term)),
    );
  }, [faculties, selectedFacultyIds, facultySearch]);

  const filteredClasses = useMemo(() => {
    const term = classSearch.trim().toLowerCase();
    return classes.filter(
      (c: any) =>
        !selectedClassIds.includes(c.id) &&
        (c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term)),
    );
  }, [classes, selectedClassIds, classSearch]);

  return (
    <div className="space-y-4">
      {/* 1. THEO CÁ NHÂN */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5 text-primary-600" />
          1. Cá nhân cụ thể
        </label>
        <div className="relative" ref={userDropdownRef}>
          <div
            className="flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-1.5 text-xs focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 cursor-text"
            onClick={() => userInputRef.current?.focus()}
          >
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700"
              >
                <span>{u.full_name || u.username}</span>
                {renderUserBadge && renderUserBadge(u)}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedUsers((p) => p.filter((x) => x.id !== u.id))
                  }
                  className="rounded-full hover:bg-blue-200/50 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <input
              ref={userInputRef}
              type="text"
              className="flex-1 min-w-[120px] bg-transparent outline-none text-xs text-gray-900 placeholder:text-gray-400"
              placeholder="Gõ tên, email hoặc MSSV..."
              value={userInputValue}
              onChange={(e) => {
                setUserInputValue(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
            />
          </div>
          {showUserDropdown &&
            (debouncedUserTerm.length >= 2 || isUserFetching) && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                {isUserFetching ? (
                  <div className="p-2 text-center text-xs text-gray-500">
                    Đang tìm người dùng...
                  </div>
                ) : availableUserSuggestions.length > 0 ? (
                  availableUserSuggestions.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUsers((p) => [...p, u]);
                        setUserInputValue("");
                        setShowUserDropdown(false);
                      }}
                      className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          {u.full_name || u.username}
                          {renderUserBadge && renderUserBadge(u)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {u.student_code ? `${u.student_code} • ` : ""}
                          {u.email}
                        </div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-center text-xs text-gray-500">
                    Không tìm thấy người dùng
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* 2. THEO MÃ SINH VIÊN */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <Regex className="h-3.5 w-3.5 text-primary-600" />
          2. Tiền tố / Pattern mã Sinh Viên (vd: 241, K65)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            placeholder="Nhập chuỗi ký tự trong MSSV (vd: 241)..."
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddPattern();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddPattern}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
          >
            Thêm
          </button>
        </div>
        {patterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {patterns.map((pat) => (
              <span
                key={pat}
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs text-purple-700"
              >
                <span>Mã chứa: &quot;{pat}&quot;</span>
                <button
                  type="button"
                  onClick={() => setPatterns((p) => p.filter((x) => x !== pat))}
                  className="rounded-full hover:bg-purple-200/50 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. THEO LỚP & KHOA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* LỚP */}
        <div className="space-y-1.5" ref={classDropdownRef}>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary-600" />
            3. Theo Lớp
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Tìm và chọn Lớp..."
              value={classSearch}
              onChange={(e) => {
                setClassSearch(e.target.value);
                setShowClassDropdown(true);
              }}
              onFocus={() => setShowClassDropdown(true)}
            />
            {showClassDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                {filteredClasses.length > 0 ? (
                  filteredClasses.slice(0, 10).map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClassIds((p) => [...p, c.id]);
                        setClassSearch("");
                        setShowClassDropdown(false);
                      }}
                      className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                    >
                      <span>
                        {c.name} ({c.code})
                      </span>
                      <Plus className="h-3 w-3 text-gray-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-center text-xs text-gray-500">
                    Không còn Lớp phù hợp
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedClassIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedClassIds.map((id) => {
                const cls = classes.find((c: any) => c.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] text-emerald-700"
                  >
                    <span>{cls?.name || `Lớp #${id}`}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedClassIds((p) => p.filter((x) => x !== id))
                      }
                      className="hover:bg-emerald-200/50 rounded p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* KHOA */}
        <div className="space-y-1.5" ref={facultyDropdownRef}>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary-600" />
            4. Theo Khoa
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Tìm và chọn Khoa..."
              value={facultySearch}
              onChange={(e) => {
                setFacultySearch(e.target.value);
                setShowFacultyDropdown(true);
              }}
              onFocus={() => setShowFacultyDropdown(true)}
            />
            {showFacultyDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                {filteredFaculties.length > 0 ? (
                  filteredFaculties.slice(0, 10).map((f: any) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedFacultyIds((p) => [...p, f.id]);
                        setFacultySearch("");
                        setShowFacultyDropdown(false);
                      }}
                      className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                    >
                      <span>
                        {f.name} ({f.code})
                      </span>
                      <Plus className="h-3 w-3 text-gray-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-center text-xs text-gray-500">
                    Không còn Khoa phù hợp
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedFacultyIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedFacultyIds.map((id) => {
                const fac = faculties.find((f: any) => f.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] text-amber-700"
                  >
                    <span>{fac?.name || `Khoa #${id}`}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFacultyIds((p) => p.filter((x) => x !== id))
                      }
                      className="hover:bg-amber-200/50 rounded p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
