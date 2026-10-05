export interface MockFolder {
  id: string;
  name: string;
  count: number;
}

export const folders: MockFolder[] = [
  { id: "f1", name: "Giáo trình", count: 35 },
  { id: "f2", name: "Bài Tập", count: 42 },
  { id: "f3", name: "Tài liệu tham khảo", count: 50 },
  { id: "f4", name: "Đồ án tốt nghiệp", count: 15 },
];
