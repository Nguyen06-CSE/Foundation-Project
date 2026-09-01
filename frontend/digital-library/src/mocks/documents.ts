import { type FileTypeMap } from "@/components/shared/FileIcon";

export interface MockDocument {
  id: string;
  title: string;
  fileType: FileTypeMap | string;
  sizeLabel: string;
  updatedAtLabel: string;
  owner: string;
}

export const documents: MockDocument[] = [
  {
    id: "1",
    title: "Giáo trình Cấu trúc dữ liệu và giải thuật.pdf",
    fileType: "pdf",
    sizeLabel: "14.2 MB",
    updatedAtLabel: "10 phút trước",
    owner: "Tôi",
  },
  {
    id: "2",
    title: "Bài tập lớn Hệ quản trị CSDL.docx",
    fileType: "docx",
    sizeLabel: "2.4 MB",
    updatedAtLabel: "2 giờ trước",
    owner: "Tôi",
  },
  {
    id: "3",
    title: "Slide Bài giảng mạng máy tính.pptx",
    fileType: "pptx",
    sizeLabel: "8.1 MB",
    updatedAtLabel: "Hôm qua",
    owner: "Tôi",
  },
  {
    id: "4",
    title: "Sơ đồ kiến trúc phần mềm.drawio",
    fileType: "code",
    sizeLabel: "450 KB",
    updatedAtLabel: "3 ngày trước",
    owner: "Tôi",
  },
  {
    id: "5",
    title: "Tài liệu tham khảo NoSQL.zip",
    fileType: "zip",
    sizeLabel: "28.5 MB",
    updatedAtLabel: "1 tuần trước",
    owner: "Tôi",
  },
  {
    id: "6",
    title: "Bài giảng Lập trình hướng đối tượng.pdf",
    fileType: "pdf",
    sizeLabel: "5.7 MB",
    updatedAtLabel: "Hôm qua",
    owner: "Tôi",
  },
  {
    id: "7",
    title: "Đề cương ôn tập Toán cao cấp.docx",
    fileType: "docx",
    sizeLabel: "1.1 MB",
    updatedAtLabel: "3 ngày trước",
    owner: "Tôi",
  },
  {
    id: "8",
    title: "Slide Kiến trúc máy tính.pptx",
    fileType: "pptx",
    sizeLabel: "12.3 MB",
    updatedAtLabel: "5 ngày trước",
    owner: "Tôi",
  },
  {
    id: "9",
    title: "Source code đồ án Web.zip",
    fileType: "zip",
    sizeLabel: "47.8 MB",
    updatedAtLabel: "1 tuần trước",
    owner: "Tôi",
  },
  {
    id: "10",
    title: "Script cơ sở dữ liệu.sql",
    fileType: "code",
    sizeLabel: "89 KB",
    updatedAtLabel: "2 tuần trước",
    owner: "Tôi",
  },
];
