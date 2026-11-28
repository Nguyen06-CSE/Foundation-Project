"""Dữ liệu tổng hợp cho bộ đánh giá Phase 0B.

Đây là nguồn dữ liệu duy nhất (single source of truth). `generate_corpus.py`
sinh file nhị phân + manifest/questions; `run_baseline.py` chỉ đọc các file
đã sinh. Toàn bộ nội dung là hư cấu, không chứa dữ liệu cá nhân thật.
"""

from __future__ import annotations

from typing import Any

DATASET_VERSION = "1.0"

USERS: dict[str, dict[str, Any]] = {
    "sv_an": {"id": 1, "name": "Nguyễn Văn An"},
    "sv_binh": {"id": 2, "name": "Trần Thị Bình"},
}

# Quyền thành viên nhóm: owner luôn truy cập được; member có view/full.
WORKSPACES: dict[str, dict[str, Any]] = {
    "G1": {
        "id": 11,
        "name": "Nhóm Học tập 01",
        "owner": "sv_binh",
        "members": {"sv_an": "view"},
    },
    "G2": {
        "id": 12,
        "name": "Nhóm Đồ án 02",
        "owner": "sv_an",
        "members": {"sv_binh": "view"},
    },
    "G3": {
        "id": 13,
        "name": "Nhóm Nghiên cứu 03",
        "owner": "sv_binh",
        "members": {},
    },
}

DOCUMENTS: list[dict[str, Any]] = []
QUESTIONS: list[dict[str, Any]] = []


def _seg(location: str, text: str) -> dict[str, str]:
    return {"location": location, "text": text}


def _doc(
    doc_id: str,
    split: str,
    fmt: str,
    owner: str,
    workspace: str | None,
    title: str,
    description: str,
    segments: list[dict[str, str]],
    *,
    tags: list[str],
    view_count: int,
    duplicate_of: str | None = None,
    bundle_children: list[str] | None = None,
    is_public: bool = False,
) -> None:
    DOCUMENTS.append(
        {
            "id": doc_id,
            "split": split,
            "format": fmt,
            "owner": owner,
            "workspace": workspace,
            "title": title,
            "description": description,
            "segments": segments,
            "text": "\n".join(s["text"] for s in segments),
            "tags": tags,
            "view_count": view_count,
            "duplicate_of": duplicate_of,
            "bundle_children": bundle_children or [],
            "is_public": is_public,
        }
    )


def _q(
    qid: str,
    split: str,
    user: str,
    kind: str,
    question: str,
    query: str,
    *,
    style: str = "accented",
    answer: str | None = None,
    citation: dict[str, str] | None = None,
    gold: list[str] | None = None,
    forbidden: list[str] | None = None,
    note: str | None = None,
) -> None:
    QUESTIONS.append(
        {
            "id": qid,
            "split": split,
            "user": user,
            "type": kind,
            "question": question,
            "query": query,
            "query_style": style,
            "answer": answer,
            "citation": citation,
            "gold_doc_ids": gold or [],
            "forbidden_doc_ids": forbidden or [],
            "note": note,
        }
    )


# ---------------------------------------------------------------------------
# CALIBRATION (15 tài liệu, 30 câu hỏi)
# ---------------------------------------------------------------------------

_doc(
    "C01",
    "calibration",
    "pdf_text",
    "sv_an",
    None,
    "Giáo trình Cơ sở dữ liệu - Chương 1",
    "Tóm tắt khái niệm nền tảng về hệ quản trị cơ sở dữ liệu quan hệ.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Tổng quan hệ quản trị cơ sở dữ liệu\n"
            "Hệ quản trị cơ sở dữ liệu quan hệ lưu dữ liệu trong các bảng gồm hàng và cột.\n"
            "Khóa chính là một cột hoặc tổ hợp cột dùng để xác định duy nhất mỗi hàng trong bảng.\n"
            "Thuộc tính ACID gồm tính nguyên tử, tính nhất quán, tính cô lập và tính bền vững.\n"
            "Chỉ mục B-tree giúp tăng tốc truy vấn tìm kiếm theo khóa.",
        )
    ],
    tags=["cơ sở dữ liệu", "giáo trình"],
    view_count=12,
)

_doc(
    "C02",
    "calibration",
    "pdf_text",
    "sv_binh",
    "G1",
    "Bài giảng Mạng máy tính",
    "Mô hình OSI và bộ giao thức TCP/IP trong mạng máy tính.",
    [
        _seg(
            "trang 1, mục 1",
            "Mục 1. Mô hình OSI\n"
            "Mô hình OSI gồm bảy lớp, từ lớp vật lý đến lớp ứng dụng.\n"
            "Lớp giao vận chịu trách nhiệm chia nhỏ dữ liệu và ghép lại ở đích.\n"
            "Giao thức TCP đảm bảo truyền dữ liệu tin cậy, có thứ tự và kiểm tra lỗi.\n"
            "Địa chỉ IP dùng để định danh thiết bị trong mạng.",
        )
    ],
    tags=["mạng máy tính", "bài giảng"],
    view_count=8,
)

_doc(
    "C03",
    "calibration",
    "pdf_scan",
    "sv_an",
    None,
    "Đề cương Học máy",
    "Các khái niệm cơ bản về học có giám sát và quá khớp.",
    [
        _seg(
            "trang 1, mục Bài 1",
            "Bài 1. Học có giám sát\n"
            "Học có giám sát sử dụng dữ liệu đã gán nhãn để huấn luyện mô hình.\n"
            "Học không giám sát tìm cấu trúc ẩn trong dữ liệu chưa gán nhãn.\n"
            "Quá khớp xảy ra khi mô hình học thuộc dữ liệu huấn luyện nhưng kém trên dữ liệu mới.\n"
            "Kỹ thuật kiểm chứng chéo giúp đánh giá khả năng tổng quát hóa.",
        )
    ],
    tags=["học máy", "đề cương"],
    view_count=5,
)

_doc(
    "C04",
    "calibration",
    "pdf_scan",
    "sv_binh",
    "G1",
    "Tài liệu An toàn thông tin",
    "Tam giác CIA và các khái niệm mã hóa cơ bản.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Tam giác CIA\n"
            "Tính bảo mật, tính toàn vẹn và tính sẵn sàng tạo thành tam giác CIA.\n"
            "Mã hóa đối xứng dùng cùng một khóa cho mã hóa và giải mã.\n"
            "Mã hóa bất đối xứng dùng cặp khóa công khai và khóa riêng.\n"
            "Chữ ký số giúp xác thực nguồn gốc và tính toàn vẹn của thông điệp.",
        )
    ],
    tags=["an toàn thông tin", "mã hóa"],
    view_count=9,
)

_doc(
    "C05",
    "calibration",
    "pdf_mixed",
    "sv_an",
    None,
    "Báo cáo Phân tích dữ liệu",
    "Xử lý dữ liệu với pandas và trực quan hóa kết quả.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Xử lý dữ liệu với pandas\n"
            "DataFrame là cấu trúc dữ liệu dạng bảng hai chiều trong pandas.\n"
            "Hàm groupby dùng để nhóm dữ liệu theo một hoặc nhiều cột.\n"
            "Hàm merge dùng để nối hai DataFrame theo khóa chung.",
        ),
        _seg(
            "trang 2, mục Chương 2",
            "Chương 2. Trực quan hóa dữ liệu\n"
            "Biểu đồ cột phù hợp để so sánh giá trị giữa các nhóm.\n"
            "Biểu đồ đường thể hiện xu hướng theo thời gian.\n"
            "Biểu đồ phân tán giúp phát hiện tương quan giữa hai biến.",
        ),
    ],
    tags=["phân tích dữ liệu", "pandas"],
    view_count=15,
)

_doc(
    "C06",
    "calibration",
    "pdf_mixed",
    "sv_binh",
    "G1",
    "Hướng dẫn Docker",
    "Kiến thức cơ bản về image, container, volume và mạng Docker.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Docker cơ bản\n"
            "Docker image là khuôn mẫu chỉ đọc để tạo container.\n"
            "Container là môi trường chạy độc lập được tạo từ image.\n"
            "Dockerfile chứa các chỉ dẫn để xây dựng image.",
        ),
        _seg(
            "trang 2, mục Chương 2",
            "Chương 2. Dữ liệu và mạng\n"
            "Volume dùng để lưu dữ liệu bền vững ngoài vòng đời container.\n"
            "Mạng bridge cho phép các container trên cùng máy chủ giao tiếp.\n"
            "Cổng publish giúp truy cập dịch vụ trong container từ máy chủ.",
        ),
    ],
    tags=["docker", "hạ tầng"],
    view_count=7,
)

_doc(
    "C07",
    "calibration",
    "docx",
    "sv_an",
    None,
    "Quy trình Scrum",
    "Vai trò, sự kiện và các thành phần chính trong Scrum.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Vai trò và sự kiện\n"
            "Scrum có ba vai trò chính: Product Owner, Scrum Master và Development Team.\n"
            "Sprint là khoảng thời gian cố định, thường từ hai đến bốn tuần.\n"
            "Product Backlog là danh sách ưu tiên các hạng mục cần thực hiện.\n"
            "Sprint Review diễn ra cuối sprint để trình bày kết quả.",
        )
    ],
    tags=["scrum", "quản lý dự án"],
    view_count=11,
)

_doc(
    "C08",
    "calibration",
    "docx",
    "sv_binh",
    "G1",
    "Thiết kế REST API",
    "Phương thức HTTP và mã trạng thái trong thiết kế REST API.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Thiết kế tài nguyên\n"
            "REST API sử dụng các phương thức HTTP để thao tác tài nguyên.\n"
            "GET dùng để đọc tài nguyên, POST dùng để tạo mới.\n"
            "PUT cập nhật toàn bộ tài nguyên, PATCH cập nhật một phần.\n"
            "Mã trạng thái 404 biểu thị tài nguyên không tồn tại.",
        )
    ],
    tags=["rest api", "backend"],
    view_count=6,
)

_doc(
    "C09",
    "calibration",
    "docx",
    "sv_binh",
    "G3",
    "Kiến trúc Microservices",
    "Tài liệu nội bộ của nhóm nghiên cứu về microservices.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Thành phần kiến trúc\n"
            "Kiến trúc microservices chia hệ thống thành các dịch vụ độc lập.\n"
            "API gateway là điểm vào duy nhất, định tuyến yêu cầu đến dịch vụ phù hợp.\n"
            "Service discovery giúp dịch vụ tìm thấy nhau.\n"
            "Mỗi dịch vụ có cơ sở dữ liệu riêng.",
        )
    ],
    tags=["microservices", "kiến trúc"],
    view_count=3,
)

_doc(
    "C10",
    "calibration",
    "docx",
    "sv_binh",
    None,
    "Kinh tế vi mô",
    "Ghi chú cá nhân về cung cầu và độ co giãn.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Cung cầu và độ co giãn\n"
            "Độ co giãn của cầu theo giá đo mức thay đổi phần trăm lượng cầu khi giá thay đổi một phần trăm.\n"
            "Cầu co giãn khi trị tuyệt đối lớn hơn 1.\n"
            "Hàng hóa thiết yếu thường ít co giãn.\n"
            "Lạm phát làm giảm sức mua.",
        )
    ],
    tags=["kinh tế", "vi mô"],
    view_count=4,
)

_doc(
    "C11",
    "calibration",
    "pptx",
    "sv_an",
    None,
    "Tổng quan Trí tuệ nhân tạo",
    "Slide giới thiệu AI, học máy và học sâu.",
    [
        _seg(
            "slide 1",
            "Slide 1. Trí tuệ nhân tạo\n"
            "Trí tuệ nhân tạo là lĩnh vực xây dựng hệ thống có khả năng thực hiện nhiệm vụ thông minh.\n"
            "Học máy là một nhánh của trí tuệ nhân tạo, sử dụng dữ liệu để học quy luật.\n"
            "Học sâu sử dụng mạng nơ-ron nhiều lớp để học biểu diễn dữ liệu.",
        )
    ],
    tags=["trí tuệ nhân tạo", "học máy"],
    view_count=20,
)

_doc(
    "C12",
    "calibration",
    "pptx",
    "sv_binh",
    "G1",
    "Quản lý dự án Agile",
    "Slide về Agile, user story và velocity.",
    [
        _seg(
            "slide 1",
            "Slide 1. Quản lý dự án Agile\n"
            "Agile ưu tiên phản hồi nhanh với thay đổi thay vì tuân thủ kế hoạch cứng nhắc.\n"
            "User story mô tả yêu cầu từ góc nhìn người dùng.\n"
            "Velocity đo lượng công việc hoàn thành trong một sprint.\n"
            "Daily stand-up là cuộc họp ngắn hằng ngày để đồng bộ tiến độ.",
        )
    ],
    tags=["agile", "quản lý dự án"],
    view_count=10,
)

_doc(
    "C13",
    "calibration",
    "pptx",
    "sv_binh",
    None,
    "Lịch sử Việt Nam",
    "Ghi chú cá nhân về một số mốc lịch sử.",
    [
        _seg(
            "slide 1",
            "Slide 1. Một số mốc lịch sử\n"
            "Chiến thắng Bạch Đằng năm 1288 do Trần Hưng Đạo chỉ huy.\n"
            "Nhà Lý dời đô về Thăng Long năm 1010.\n"
            "Nhà Lê sơ kéo dài từ năm 1428 đến năm 1527.",
        )
    ],
    tags=["lịch sử", "việt nam"],
    view_count=3,
)

_doc(
    "C14",
    "calibration",
    "pdf_text",
    "sv_binh",
    "G1",
    "Giáo trình Cơ sở dữ liệu - bản nhóm",
    "Bản sao tài liệu CSDL được chia sẻ trong nhóm học tập.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Tổng quan hệ quản trị cơ sở dữ liệu\n"
            "Hệ quản trị cơ sở dữ liệu quan hệ lưu dữ liệu trong các bảng gồm hàng và cột.\n"
            "Khóa chính là một cột hoặc tổ hợp cột dùng để xác định duy nhất mỗi hàng trong bảng.\n"
            "Thuộc tính ACID gồm tính nguyên tử, tính nhất quán, tính cô lập và tính bền vững.\n"
            "Chỉ mục B-tree giúp tăng tốc truy vấn tìm kiếm theo khóa.",
        )
    ],
    tags=["cơ sở dữ liệu", "giáo trình"],
    view_count=2,
    duplicate_of="C01",
)

_doc(
    "C15",
    "calibration",
    "pdf_text",
    "sv_an",
    "G2",
    "Bài giảng Mạng máy tính - bản đồ án",
    "Bản sao bài giảng mạng dùng trong nhóm đồ án.",
    [
        _seg(
            "trang 1, mục 1",
            "Mục 1. Mô hình OSI\n"
            "Mô hình OSI gồm bảy lớp, từ lớp vật lý đến lớp ứng dụng.\n"
            "Lớp giao vận chịu trách nhiệm chia nhỏ dữ liệu và ghép lại ở đích.\n"
            "Giao thức TCP đảm bảo truyền dữ liệu tin cậy, có thứ tự và kiểm tra lỗi.\n"
            "Địa chỉ IP dùng để định danh thiết bị trong mạng.",
        )
    ],
    tags=["mạng máy tính", "bài giảng"],
    view_count=1,
    duplicate_of="C02",
)

# --- Câu hỏi calibration: 24 trả lời được + 3 ngoài quyền + 3 không đủ căn cứ

_q(
    "CQ01", "calibration", "sv_an", "answerable",
    "Khóa chính có vai trò gì trong bảng?",
    "khóa chính xác định duy nhất",
    answer="Xác định duy nhất mỗi hàng trong bảng.",
    citation={
        "doc_id": "C01",
        "quote": "Khóa chính là một cột hoặc tổ hợp cột dùng để xác định duy nhất mỗi hàng trong bảng.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C01", "C14"],
)
_q(
    "CQ02", "calibration", "sv_an", "answerable",
    "Bốn thuộc tính của ACID là gì?",
    "acid nguyen tu nhat quan co lap ben vung",
    style="unaccented",
    answer="Nguyên tử, nhất quán, cô lập và bền vững.",
    citation={
        "doc_id": "C01",
        "quote": "Thuộc tính ACID gồm tính nguyên tử, tính nhất quán, tính cô lập và tính bền vững.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C01", "C14"],
)
_q(
    "CQ03", "calibration", "sv_an", "answerable",
    "Mô hình OSI có bao nhiêu lớp?",
    "mô hình OSI bảy lớp",
    answer="Bảy lớp.",
    citation={
        "doc_id": "C02",
        "quote": "Mô hình OSI gồm bảy lớp, từ lớp vật lý đến lớp ứng dụng.",
        "location": "trang 1, mục 1",
    },
    gold=["C02", "C15"],
)
_q(
    "CQ04", "calibration", "sv_an", "answerable",
    "TCP đảm bảo chất lượng truyền dữ liệu như thế nào?",
    "tcp truyen du lieu tin cay co thu tu",
    style="unaccented",
    answer="Tin cậy, có thứ tự và có kiểm tra lỗi.",
    citation={
        "doc_id": "C02",
        "quote": "Giao thức TCP đảm bảo truyền dữ liệu tin cậy, có thứ tự và kiểm tra lỗi.",
        "location": "trang 1, mục 1",
    },
    gold=["C02", "C15"],
)
_q(
    "CQ05", "calibration", "sv_an", "answerable",
    "Học có giám sát dùng dữ liệu gì để huấn luyện?",
    "học có giám sát dữ liệu gán nhãn",
    answer="Dữ liệu đã gán nhãn.",
    citation={
        "doc_id": "C03",
        "quote": "Học có giám sát sử dụng dữ liệu đã gán nhãn để huấn luyện mô hình.",
        "location": "trang 1, mục Bài 1",
    },
    gold=["C03"],
)
_q(
    "CQ06", "calibration", "sv_an", "answerable",
    "Quá khớp xảy ra khi nào?",
    "qua khop hoc thuoc du lieu huan luyen",
    style="unaccented",
    answer="Khi mô hình học thuộc dữ liệu huấn luyện nhưng kém trên dữ liệu mới.",
    citation={
        "doc_id": "C03",
        "quote": "Quá khớp xảy ra khi mô hình học thuộc dữ liệu huấn luyện nhưng kém trên dữ liệu mới.",
        "location": "trang 1, mục Bài 1",
    },
    gold=["C03"],
)
_q(
    "CQ07", "calibration", "sv_an", "answerable",
    "Tam giác CIA gồm những tính chất nào?",
    "tam giác CIA bảo mật toàn vẹn sẵn sàng",
    answer="Bảo mật, toàn vẹn và sẵn sàng.",
    citation={
        "doc_id": "C04",
        "quote": "Tính bảo mật, tính toàn vẹn và tính sẵn sàng tạo thành tam giác CIA.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C04"],
)
_q(
    "CQ08", "calibration", "sv_an", "answerable",
    "Chữ ký số giúp xác thực điều gì?",
    "chu ky so xac thuc nguon goc toan ven",
    style="unaccented",
    answer="Nguồn gốc và tính toàn vẹn của thông điệp.",
    citation={
        "doc_id": "C04",
        "quote": "Chữ ký số giúp xác thực nguồn gốc và tính toàn vẹn của thông điệp.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C04"],
)
_q(
    "CQ09", "calibration", "sv_an", "answerable",
    "DataFrame trong pandas là gì?",
    "dataframe cấu trúc bảng hai chiều",
    answer="Cấu trúc dữ liệu dạng bảng hai chiều.",
    citation={
        "doc_id": "C05",
        "quote": "DataFrame là cấu trúc dữ liệu dạng bảng hai chiều trong pandas.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C05"],
)
_q(
    "CQ10", "calibration", "sv_an", "answerable",
    "Biểu đồ đường phù hợp để thể hiện điều gì?",
    "bieu do duong xu huong thoi gian",
    style="unaccented",
    answer="Xu hướng theo thời gian.",
    citation={
        "doc_id": "C05",
        "quote": "Biểu đồ đường thể hiện xu hướng theo thời gian.",
        "location": "trang 2, mục Chương 2",
    },
    gold=["C05"],
)
_q(
    "CQ11", "calibration", "sv_an", "answerable",
    "Docker image là gì?",
    "docker image khuon mau chi doc",
    style="unaccented",
    answer="Khuôn mẫu chỉ đọc để tạo container.",
    citation={
        "doc_id": "C06",
        "quote": "Docker image là khuôn mẫu chỉ đọc để tạo container.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C06"],
)
_q(
    "CQ12", "calibration", "sv_an", "answerable",
    "Volume dùng để làm gì?",
    "volume lưu dữ liệu bền vững",
    answer="Lưu dữ liệu bền vững ngoài vòng đời container.",
    citation={
        "doc_id": "C06",
        "quote": "Volume dùng để lưu dữ liệu bền vững ngoài vòng đời container.",
        "location": "trang 2, mục Chương 2",
    },
    gold=["C06"],
)
_q(
    "CQ13", "calibration", "sv_an", "answerable",
    "Sprint thường kéo dài bao lâu?",
    "sprint khoang thoi gian hai den bon tuan",
    style="unaccented",
    answer="Từ hai đến bốn tuần.",
    citation={
        "doc_id": "C07",
        "quote": "Sprint là khoảng thời gian cố định, thường từ hai đến bốn tuần.",
        "location": "mục Phần 1",
    },
    gold=["C07"],
)
_q(
    "CQ14", "calibration", "sv_an", "answerable",
    "Product Backlog là gì?",
    "product backlog danh sách ưu tiên",
    answer="Danh sách ưu tiên các hạng mục cần thực hiện.",
    citation={
        "doc_id": "C07",
        "quote": "Product Backlog là danh sách ưu tiên các hạng mục cần thực hiện.",
        "location": "mục Phần 1",
    },
    gold=["C07"],
)
_q(
    "CQ15", "calibration", "sv_an", "answerable",
    "Phương thức HTTP nào dùng để tạo mới tài nguyên?",
    "post tao moi tai nguyen",
    style="unaccented",
    answer="POST.",
    citation={
        "doc_id": "C08",
        "quote": "GET dùng để đọc tài nguyên, POST dùng để tạo mới.",
        "location": "mục Phần 1",
    },
    gold=["C08"],
)
_q(
    "CQ16", "calibration", "sv_an", "answerable",
    "Mã trạng thái 404 có ý nghĩa gì?",
    "mã trạng thái 404 tài nguyên không tồn tại",
    answer="Tài nguyên không tồn tại.",
    citation={
        "doc_id": "C08",
        "quote": "Mã trạng thái 404 biểu thị tài nguyên không tồn tại.",
        "location": "mục Phần 1",
    },
    gold=["C08"],
)
_q(
    "CQ17", "calibration", "sv_an", "answerable",
    "Học máy là gì?",
    "học máy nhánh trí tuệ nhân tạo",
    answer="Một nhánh của trí tuệ nhân tạo sử dụng dữ liệu để học quy luật.",
    citation={
        "doc_id": "C11",
        "quote": "Học máy là một nhánh của trí tuệ nhân tạo, sử dụng dữ liệu để học quy luật.",
        "location": "slide 1",
    },
    gold=["C11"],
)
_q(
    "CQ18", "calibration", "sv_an", "answerable",
    "Học sâu sử dụng công nghệ gì?",
    "hoc sau mang no ron nhieu lop",
    style="unaccented",
    answer="Mạng nơ-ron nhiều lớp.",
    citation={
        "doc_id": "C11",
        "quote": "Học sâu sử dụng mạng nơ-ron nhiều lớp để học biểu diễn dữ liệu.",
        "location": "slide 1",
    },
    gold=["C11"],
)
_q(
    "CQ19", "calibration", "sv_an", "answerable",
    "User story mô tả điều gì?",
    "user story yêu cầu góc nhìn người dùng",
    answer="Yêu cầu từ góc nhìn người dùng.",
    citation={
        "doc_id": "C12",
        "quote": "User story mô tả yêu cầu từ góc nhìn người dùng.",
        "location": "slide 1",
    },
    gold=["C12"],
)
_q(
    "CQ20", "calibration", "sv_an", "answerable",
    "Velocity đo gì?",
    "velocity cong viec hoan thanh trong sprint",
    style="unaccented",
    answer="Lượng công việc hoàn thành trong một sprint.",
    citation={
        "doc_id": "C12",
        "quote": "Velocity đo lượng công việc hoàn thành trong một sprint.",
        "location": "slide 1",
    },
    gold=["C12"],
)
_q(
    "CQ21", "calibration", "sv_an", "answerable",
    "Chỉ mục B-tree giúp ích gì?",
    "chỉ mục B-tree tăng tốc truy vấn",
    answer="Tăng tốc truy vấn tìm kiếm theo khóa.",
    citation={
        "doc_id": "C14",
        "quote": "Chỉ mục B-tree giúp tăng tốc truy vấn tìm kiếm theo khóa.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C01", "C14"],
)
_q(
    "CQ22", "calibration", "sv_an", "answerable",
    "Hệ quản trị cơ sở dữ liệu quan hệ lưu dữ liệu ở đâu?",
    "he quan tri co so du lieu quan he bang hang cot",
    style="unaccented",
    answer="Trong các bảng gồm hàng và cột.",
    citation={
        "doc_id": "C14",
        "quote": "Hệ quản trị cơ sở dữ liệu quan hệ lưu dữ liệu trong các bảng gồm hàng và cột.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["C01", "C14"],
)
_q(
    "CQ23", "calibration", "sv_an", "answerable",
    "Lớp giao vận trong mô hình OSI làm gì?",
    "lớp giao vận chia nhỏ dữ liệu",
    answer="Chia nhỏ dữ liệu và ghép lại ở đích.",
    citation={
        "doc_id": "C15",
        "quote": "Lớp giao vận chịu trách nhiệm chia nhỏ dữ liệu và ghép lại ở đích.",
        "location": "trang 1, mục 1",
    },
    gold=["C02", "C15"],
)
_q(
    "CQ24", "calibration", "sv_an", "answerable",
    "Địa chỉ IP dùng để làm gì?",
    "dia chi ip dinh danh thiet bi trong mang",
    style="unaccented",
    answer="Định danh thiết bị trong mạng.",
    citation={
        "doc_id": "C15",
        "quote": "Địa chỉ IP dùng để định danh thiết bị trong mạng.",
        "location": "trang 1, mục 1",
    },
    gold=["C02", "C15"],
)
_q(
    "CQ25", "calibration", "sv_an", "forbidden",
    "API gateway có vai trò gì?",
    "api gateway diem vao duy nhat dinh tuyen",
    style="unaccented",
    answer="Là điểm vào duy nhất, định tuyến yêu cầu đến dịch vụ phù hợp.",
    citation={
        "doc_id": "C09",
        "quote": "API gateway là điểm vào duy nhất, định tuyến yêu cầu đến dịch vụ phù hợp.",
        "location": "mục Phần 1",
    },
    forbidden=["C09"],
    note="Tài liệu thuộc G3; sv_an không phải thành viên.",
)
_q(
    "CQ26", "calibration", "sv_an", "forbidden",
    "Độ co giãn của cầu theo giá đo gì?",
    "do co gian cua cau theo gia",
    style="unaccented",
    answer="Mức thay đổi phần trăm lượng cầu khi giá thay đổi một phần trăm.",
    citation={
        "doc_id": "C10",
        "quote": "Độ co giãn của cầu theo giá đo mức thay đổi phần trăm lượng cầu khi giá thay đổi một phần trăm.",
        "location": "mục Phần 1",
    },
    forbidden=["C10"],
    note="Tài liệu cá nhân của sv_binh.",
)
_q(
    "CQ27", "calibration", "sv_an", "forbidden",
    "Chiến thắng Bạch Đằng năm 1288 do ai chỉ huy?",
    "chien thang Bach Dang 1288 Tran Hung Dao",
    style="unaccented",
    answer="Trần Hưng Đạo.",
    citation={
        "doc_id": "C13",
        "quote": "Chiến thắng Bạch Đằng năm 1288 do Trần Hưng Đạo chỉ huy.",
        "location": "slide 1",
    },
    forbidden=["C13"],
    note="Tài liệu cá nhân của sv_binh.",
)
_q(
    "CQ28", "calibration", "sv_an", "no_evidence",
    "Quy trình nấu phở bò gia truyền gồm những bước nào?",
    "quy trình nấu phở bò gia truyền",
    note="Không tài liệu nào trong bộ mẫu chứa công thức nấu phở.",
)
_q(
    "CQ29", "calibration", "sv_an", "no_evidence",
    "Máy chủ Dell PowerEdge R750 có thời gian bảo hành bao nhiêu tháng?",
    "thời gian bảo hành máy chủ Dell PowerEdge R750",
    note="Không có tài liệu phần cứng hoặc chính sách bảo hành.",
)
_q(
    "CQ30", "calibration", "sv_an", "no_evidence",
    "Giá vé tàu Hà Nội Đà Nẵng tháng 12 là bao nhiêu?",
    "giá vé tàu Hà Nội Đà Nẵng tháng 12",
    note="Không có bảng giá hoặc thông tin giao thông.",
)

# ---------------------------------------------------------------------------
# EVALUATION (15 tài liệu, 30 câu hỏi)
# ---------------------------------------------------------------------------

_doc(
    "E01",
    "evaluation",
    "pdf_text",
    "sv_an",
    None,
    "Cơ sở dữ liệu nâng cao",
    "Giao dịch, chỉ mục và mức cô lập trong PostgreSQL.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Giao dịch và chỉ mục\n"
            "Giao dịch đảm bảo các thao tác hoặc cùng thành công hoặc cùng thất bại.\n"
            "Chỉ mục B-tree hỗ trợ tìm kiếm theo khoảng giá trị.\n"
            "Chỉ mục hash phù hợp cho tìm kiếm bằng đúng.\n"
            "Mức cô lập có thể điều chỉnh để cân bằng hiệu năng và nhất quán.",
        )
    ],
    tags=["cơ sở dữ liệu", "postgresql"],
    view_count=18,
)

_doc(
    "E02",
    "evaluation",
    "pdf_text",
    "sv_binh",
    "G1",
    "Mạng không dây",
    "Chuẩn IEEE 802.11, băng tần và bảo mật Wi-Fi.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Chuẩn IEEE 802.11\n"
            "Wi-Fi hoạt động theo chuẩn IEEE 802.11.\n"
            "Băng tần 2.4 GHz có phạm vi tốt hơn nhưng dễ nhiễu.\n"
            "Băng tần 5 GHz có tốc độ cao hơn nhưng phạm vi ngắn hơn.\n"
            "WPA3 là giao thức bảo mật Wi-Fi hiện đại.",
        )
    ],
    tags=["mạng không dây", "wifi"],
    view_count=13,
)

_doc(
    "E03",
    "evaluation",
    "pdf_scan",
    "sv_an",
    None,
    "Học sâu",
    "Ghi chú về mạng tích chập và các kỹ thuật huấn luyện.",
    [
        _seg(
            "trang 1, mục Ghi chú",
            "Mạng nơ-ron tích chập thường dùng cho dữ liệu ảnh.\n"
            "Hàm kích hoạt ReLU giúp giảm hiện tượng triệt tiêu đạo hàm.\n"
            "Dropout tắt ngẫu nhiên một phần nơ-ron khi huấn luyện.\n"
            "Batch normalization ổn định quá trình huấn luyện.",
        )
    ],
    tags=["học sâu", "học máy"],
    view_count=17,
)

_doc(
    "E04",
    "evaluation",
    "pdf_scan",
    "sv_binh",
    "G1",
    "Mật mã ứng dụng",
    "AES, RSA, SHA-256 và chữ ký số.",
    [
        _seg(
            "trang 1, mục Ghi chú",
            "AES là thuật toán mã hóa đối xứng phổ biến.\n"
            "RSA dựa trên độ khó phân tích thừa số nguyên tố.\n"
            "Hàm băm SHA-256 tạo giá trị băm 256 bit.\n"
            "Chữ ký số dùng khóa riêng để ký và khóa công khai để xác minh.",
        )
    ],
    tags=["mật mã", "an toàn thông tin"],
    view_count=14,
)

_doc(
    "E05",
    "evaluation",
    "pdf_mixed",
    "sv_an",
    None,
    "Trực quan hóa dữ liệu",
    "Biểu đồ, dashboard và khả năng tiếp cận.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Chọn biểu đồ\n"
            "Biểu đồ nhiệt dùng màu sắc để biểu diễn giá trị trong ma trận.\n"
            "Biểu đồ hộp hiển thị trung vị và tứ phân vị.\n"
            "Histogram thể hiện phân phối của một biến số.",
        ),
        _seg(
            "trang 2, mục Chương 2",
            "Chương 2. Thiết kế dashboard\n"
            "Dashboard nên có tiêu đề rõ ràng và chú thích đơn vị.\n"
            "Màu sắc cần đảm bảo độ tương phản cho người mù màu.\n"
            "Sắp xếp thông tin quan trọng ở góc trên bên trái.",
        ),
    ],
    tags=["trực quan hóa", "dashboard"],
    view_count=16,
)

_doc(
    "E06",
    "evaluation",
    "pdf_mixed",
    "sv_binh",
    "G1",
    "Kubernetes",
    "Pod, Deployment, Service, ConfigMap và Secret.",
    [
        _seg(
            "trang 1, mục Chương 1",
            "Chương 1. Đơn vị triển khai\n"
            "Pod là đơn vị triển khai nhỏ nhất trong Kubernetes.\n"
            "Deployment quản lý việc tạo và cập nhật Pod.\n"
            "Service cung cấp địa chỉ ổn định cho một nhóm Pod.",
        ),
        _seg(
            "trang 2, mục Chương 2",
            "Chương 2. Cấu hình và mở rộng\n"
            "ConfigMap lưu cấu hình không bí mật.\n"
            "Secret lưu thông tin nhạy cảm như mật khẩu.\n"
            "Horizontal Pod Autoscaler tự động tăng số Pod theo tải.",
        ),
    ],
    tags=["kubernetes", "hạ tầng"],
    view_count=19,
)

_doc(
    "E07",
    "evaluation",
    "docx",
    "sv_an",
    None,
    "Kiểm thử phần mềm",
    "Các mức kiểm thử và độ bao phủ.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Các mức kiểm thử\n"
            "Kiểm thử đơn vị kiểm tra từng hàm hoặc lớp riêng lẻ.\n"
            "Kiểm thử tích hợp kiểm tra sự phối hợp giữa các thành phần.\n"
            "Kiểm thử hồi quy đảm bảo thay đổi mới không làm hỏng chức năng cũ.\n"
            "Độ bao phủ dòng đo tỷ lệ dòng mã được thực thi bởi kiểm thử.",
        )
    ],
    tags=["kiểm thử", "chất lượng"],
    view_count=21,
)

_doc(
    "E08",
    "evaluation",
    "docx",
    "sv_binh",
    "G1",
    "Kiểm thử phần mềm - bản nhóm",
    "Bản sao tài liệu kiểm thử dùng trong nhóm học tập.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Các mức kiểm thử\n"
            "Kiểm thử đơn vị kiểm tra từng hàm hoặc lớp riêng lẻ.\n"
            "Kiểm thử tích hợp kiểm tra sự phối hợp giữa các thành phần.\n"
            "Kiểm thử hồi quy đảm bảo thay đổi mới không làm hỏng chức năng cũ.\n"
            "Độ bao phủ dòng đo tỷ lệ dòng mã được thực thi bởi kiểm thử.",
        )
    ],
    tags=["kiểm thử", "chất lượng"],
    view_count=2,
    duplicate_of="E07",
)

_doc(
    "E09",
    "evaluation",
    "docx",
    "sv_binh",
    "G3",
    "Microservices nâng cao",
    "Tài liệu nội bộ nhóm nghiên cứu về service discovery.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Khả năng chịu lỗi\n"
            "Service discovery là cơ chế giúp các dịch vụ tìm thấy địa chỉ mạng của nhau.\n"
            "API gateway chịu trách nhiệm xác thực và giới hạn tần suất.\n"
            "Circuit breaker ngăn lỗi dây chuyền.\n"
            "Observability theo dõi độ trễ và log.",
        )
    ],
    tags=["microservices", "kiến trúc"],
    view_count=5,
)

_doc(
    "E10",
    "evaluation",
    "docx",
    "sv_binh",
    None,
    "Kinh tế vĩ mô",
    "Ghi chú cá nhân về lạm phát và thất nghiệp.",
    [
        _seg(
            "mục Phần 1",
            "Phần 1. Lạm phát\n"
            "Lạm phát là sự tăng liên tục của mức giá chung.\n"
            "Lạm phát cao làm giảm sức mua của đồng tiền.\n"
            "Ngân hàng trung ương dùng lãi suất để kiểm soát lạm phát.\n"
            "Thất nghiệp và lạm phát có quan hệ đánh đổi ngắn hạn.",
        )
    ],
    tags=["kinh tế", "vĩ mô"],
    view_count=6,
)

_doc(
    "E11",
    "evaluation",
    "pptx",
    "sv_an",
    None,
    "Thiết kế UI/UX",
    "Nguyên tắc nhất quán, phản hồi và khả năng tiếp cận.",
    [
        _seg(
            "slide 1",
            "Slide 1. Nguyên tắc thiết kế\n"
            "Tính nhất quán giúp người dùng dự đoán hành vi của giao diện.\n"
            "Phản hồi tức thời cho người dùng biết hệ thống đã nhận thao tác.\n"
            "Khả năng tiếp cận đảm bảo sản phẩm dùng được với nhiều nhóm người.\n"
            "Kiểm thử khả dụng quan sát người dùng thực hiện tác vụ.",
        )
    ],
    tags=["ui/ux", "thiết kế"],
    view_count=22,
)

_doc(
    "E12",
    "evaluation",
    "pptx",
    "sv_binh",
    "G1",
    "Quản trị cơ sở dữ liệu",
    "Sao lưu, phục hồi và các chỉ tiêu RPO/RTO.",
    [
        _seg(
            "slide 1",
            "Slide 1. Sao lưu và phục hồi\n"
            "Sao lưu toàn phần tạo bản sao đầy đủ của cơ sở dữ liệu.\n"
            "Sao lưu gia tăng chỉ lưu các thay đổi kể từ lần sao lưu gần nhất.\n"
            "Điểm phục hồi mục tiêu RPO quy định lượng dữ liệu có thể mất.\n"
            "Thời gian phục hồi mục tiêu RTO quy định thời gian tối đa để khôi phục.",
        )
    ],
    tags=["cơ sở dữ liệu", "sao lưu"],
    view_count=12,
)

_doc(
    "E13",
    "evaluation",
    "bundle",
    "sv_an",
    None,
    "Bộ tài liệu ôn thi Học máy",
    "Gói gồm đề cương học máy và báo cáo phân tích dữ liệu phục vụ ôn thi cuối kỳ.",
    [
        _seg(
            "mô tả gói",
            "Gói gồm đề cương học máy và báo cáo phân tích dữ liệu phục vụ ôn thi cuối kỳ.",
        )
    ],
    tags=["học máy", "bundle"],
    view_count=8,
    bundle_children=["E03", "E05"],
)

_doc(
    "E14",
    "evaluation",
    "bundle",
    "sv_binh",
    "G1",
    "Bộ tài liệu nhóm về hạ tầng",
    "Gói gồm tài liệu Kubernetes và mật mã ứng dụng cho buổi thuyết trình nhóm.",
    [
        _seg(
            "mô tả gói",
            "Gói gồm tài liệu Kubernetes và mật mã ứng dụng cho buổi thuyết trình nhóm.",
        )
    ],
    tags=["hạ tầng", "bundle"],
    view_count=4,
    bundle_children=["E04", "E06"],
)

_doc(
    "E15",
    "evaluation",
    "pptx",
    "sv_binh",
    None,
    "Lịch sử Việt Nam - nhà Lê sơ",
    "Ghi chú cá nhân về nhà Lê sơ.",
    [
        _seg(
            "slide 1",
            "Slide 1. Nhà Lê sơ\n"
            "Nhà Lê sơ thành lập năm 1428 sau khởi nghĩa Lam Sơn.\n"
            "Lê Thánh Tông ban hành bộ luật Hồng Đức.\n"
            "Nhà Lê sơ kết thúc năm 1527.\n"
            "Vua Lê Thái Tổ là người sáng lập.",
        )
    ],
    tags=["lịch sử", "việt nam"],
    view_count=2,
)

# --- Câu hỏi evaluation: 24 trả lời được + 3 ngoài quyền + 3 không đủ căn cứ

_q(
    "EQ01", "evaluation", "sv_an", "answerable",
    "Giao dịch đảm bảo điều gì?",
    "giao dịch cùng thành công hoặc cùng thất bại",
    answer="Các thao tác hoặc cùng thành công hoặc cùng thất bại.",
    citation={
        "doc_id": "E01",
        "quote": "Giao dịch đảm bảo các thao tác hoặc cùng thành công hoặc cùng thất bại.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["E01"],
)
_q(
    "EQ02", "evaluation", "sv_an", "answerable",
    "Chỉ mục hash phù hợp cho loại tìm kiếm nào?",
    "chi muc hash tim kiem bang dung",
    style="unaccented",
    answer="Tìm kiếm bằng đúng.",
    citation={
        "doc_id": "E01",
        "quote": "Chỉ mục hash phù hợp cho tìm kiếm bằng đúng.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["E01"],
)
_q(
    "EQ03", "evaluation", "sv_an", "answerable",
    "Băng tần 5 GHz có ưu điểm gì?",
    "băng tần 5 GHz tốc độ cao phạm vi ngắn",
    answer="Tốc độ cao hơn nhưng phạm vi ngắn hơn.",
    citation={
        "doc_id": "E02",
        "quote": "Băng tần 5 GHz có tốc độ cao hơn nhưng phạm vi ngắn hơn.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["E02"],
)
_q(
    "EQ04", "evaluation", "sv_an", "answerable",
    "WPA3 là gì?",
    "wpa3 giao thuc bao mat wifi hien dai",
    style="unaccented",
    answer="Giao thức bảo mật Wi-Fi hiện đại.",
    citation={
        "doc_id": "E02",
        "quote": "WPA3 là giao thức bảo mật Wi-Fi hiện đại.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["E02"],
)
_q(
    "EQ05", "evaluation", "sv_an", "answerable",
    "Mạng nơ-ron tích chập thường dùng cho loại dữ liệu nào?",
    "mang no ron tich chap du lieu anh",
    style="unaccented",
    answer="Dữ liệu ảnh.",
    citation={
        "doc_id": "E03",
        "quote": "Mạng nơ-ron tích chập thường dùng cho dữ liệu ảnh.",
        "location": "trang 1, mục Ghi chú",
    },
    gold=["E03"],
)
_q(
    "EQ06", "evaluation", "sv_an", "answerable",
    "Dropout làm gì khi huấn luyện?",
    "dropout tat ngau nhien no ron",
    style="unaccented",
    answer="Tắt ngẫu nhiên một phần nơ-ron.",
    citation={
        "doc_id": "E03",
        "quote": "Dropout tắt ngẫu nhiên một phần nơ-ron khi huấn luyện.",
        "location": "trang 1, mục Ghi chú",
    },
    gold=["E03"],
)
_q(
    "EQ07", "evaluation", "sv_an", "answerable",
    "AES là thuật toán gì?",
    "AES thuật toán mã hóa đối xứng",
    answer="Mã hóa đối xứng phổ biến.",
    citation={
        "doc_id": "E04",
        "quote": "AES là thuật toán mã hóa đối xứng phổ biến.",
        "location": "trang 1, mục Ghi chú",
    },
    gold=["E04"],
)
_q(
    "EQ08", "evaluation", "sv_an", "answerable",
    "RSA dựa trên độ khó của bài toán nào?",
    "RSA phan tich thua so nguyen to",
    style="unaccented",
    answer="Phân tích thừa số nguyên tố.",
    citation={
        "doc_id": "E04",
        "quote": "RSA dựa trên độ khó phân tích thừa số nguyên tố.",
        "location": "trang 1, mục Ghi chú",
    },
    gold=["E04"],
)
_q(
    "EQ09", "evaluation", "sv_an", "answerable",
    "Histogram thể hiện điều gì?",
    "histogram phan phoi cua mot bien so",
    style="unaccented",
    answer="Phân phối của một biến số.",
    citation={
        "doc_id": "E05",
        "quote": "Histogram thể hiện phân phối của một biến số.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["E05"],
)
_q(
    "EQ10", "evaluation", "sv_an", "answerable",
    "Màu sắc trên dashboard cần đảm bảo gì?",
    "màu sắc dashboard độ tương phản người mù màu",
    answer="Độ tương phản cho người mù màu.",
    citation={
        "doc_id": "E05",
        "quote": "Màu sắc cần đảm bảo độ tương phản cho người mù màu.",
        "location": "trang 2, mục Chương 2",
    },
    gold=["E05"],
)
_q(
    "EQ11", "evaluation", "sv_an", "answerable",
    "Pod là gì trong Kubernetes?",
    "pod don vi trien khai nho nhat",
    style="unaccented",
    answer="Đơn vị triển khai nhỏ nhất.",
    citation={
        "doc_id": "E06",
        "quote": "Pod là đơn vị triển khai nhỏ nhất trong Kubernetes.",
        "location": "trang 1, mục Chương 1",
    },
    gold=["E06"],
)
_q(
    "EQ12", "evaluation", "sv_an", "answerable",
    "Secret dùng để lưu gì?",
    "secret lưu thông tin nhạy cảm mật khẩu",
    answer="Thông tin nhạy cảm như mật khẩu.",
    citation={
        "doc_id": "E06",
        "quote": "Secret lưu thông tin nhạy cảm như mật khẩu.",
        "location": "trang 2, mục Chương 2",
    },
    gold=["E06"],
)
_q(
    "EQ13", "evaluation", "sv_an", "answerable",
    "Kiểm thử hồi quy đảm bảo điều gì?",
    "kiểm thử hồi quy không làm hỏng chức năng cũ",
    answer="Thay đổi mới không làm hỏng chức năng cũ.",
    citation={
        "doc_id": "E07",
        "quote": "Kiểm thử hồi quy đảm bảo thay đổi mới không làm hỏng chức năng cũ.",
        "location": "mục Phần 1",
    },
    gold=["E07", "E08"],
)
_q(
    "EQ14", "evaluation", "sv_an", "answerable",
    "Độ bao phủ dòng đo gì?",
    "do bao phu dong ty le dong ma",
    style="unaccented",
    answer="Tỷ lệ dòng mã được thực thi bởi kiểm thử.",
    citation={
        "doc_id": "E07",
        "quote": "Độ bao phủ dòng đo tỷ lệ dòng mã được thực thi bởi kiểm thử.",
        "location": "mục Phần 1",
    },
    gold=["E07", "E08"],
)
_q(
    "EQ15", "evaluation", "sv_an", "answerable",
    "Kiểm thử đơn vị kiểm tra gì?",
    "kiem thu don vi tung ham hoac lop",
    style="unaccented",
    answer="Từng hàm hoặc lớp riêng lẻ.",
    citation={
        "doc_id": "E08",
        "quote": "Kiểm thử đơn vị kiểm tra từng hàm hoặc lớp riêng lẻ.",
        "location": "mục Phần 1",
    },
    gold=["E07", "E08"],
)
_q(
    "EQ16", "evaluation", "sv_an", "answerable",
    "Kiểm thử tích hợp kiểm tra gì?",
    "kiểm thử tích hợp phối hợp thành phần",
    answer="Sự phối hợp giữa các thành phần.",
    citation={
        "doc_id": "E08",
        "quote": "Kiểm thử tích hợp kiểm tra sự phối hợp giữa các thành phần.",
        "location": "mục Phần 1",
    },
    gold=["E07", "E08"],
)
_q(
    "EQ17", "evaluation", "sv_an", "answerable",
    "Phản hồi tức thời giúp gì cho người dùng?",
    "phan hoi tuc thoi he thong da nhan thao tac",
    style="unaccented",
    answer="Biết hệ thống đã nhận thao tác.",
    citation={
        "doc_id": "E11",
        "quote": "Phản hồi tức thời cho người dùng biết hệ thống đã nhận thao tác.",
        "location": "slide 1",
    },
    gold=["E11"],
)
_q(
    "EQ18", "evaluation", "sv_an", "answerable",
    "Kiểm thử khả dụng làm gì?",
    "kiểm thử khả dụng quan sát người dùng",
    answer="Quan sát người dùng thực hiện tác vụ.",
    citation={
        "doc_id": "E11",
        "quote": "Kiểm thử khả dụng quan sát người dùng thực hiện tác vụ.",
        "location": "slide 1",
    },
    gold=["E11"],
)
_q(
    "EQ19", "evaluation", "sv_an", "answerable",
    "Sao lưu gia tăng lưu những gì?",
    "sao luu gia tang cac thay doi",
    style="unaccented",
    answer="Các thay đổi kể từ lần sao lưu gần nhất.",
    citation={
        "doc_id": "E12",
        "quote": "Sao lưu gia tăng chỉ lưu các thay đổi kể từ lần sao lưu gần nhất.",
        "location": "slide 1",
    },
    gold=["E12"],
)
_q(
    "EQ20", "evaluation", "sv_an", "answerable",
    "RTO quy định điều gì?",
    "RTO thoi gian toi da khoi phuc",
    style="unaccented",
    answer="Thời gian tối đa để khôi phục.",
    citation={
        "doc_id": "E12",
        "quote": "Thời gian phục hồi mục tiêu RTO quy định thời gian tối đa để khôi phục.",
        "location": "slide 1",
    },
    gold=["E12"],
)
_q(
    "EQ21", "evaluation", "sv_an", "answerable",
    "Bộ tài liệu ôn thi Học máy gồm những tài liệu nào?",
    "bộ tài liệu ôn thi học máy đề cương báo cáo phân tích dữ liệu",
    answer="Đề cương học máy và báo cáo phân tích dữ liệu.",
    citation={
        "doc_id": "E13",
        "quote": "Gói gồm đề cương học máy và báo cáo phân tích dữ liệu phục vụ ôn thi cuối kỳ.",
        "location": "mô tả gói",
    },
    gold=["E13"],
)
_q(
    "EQ22", "evaluation", "sv_an", "answerable",
    "Gói tài liệu này phục vụ mục đích gì?",
    "goi tai lieu phuc vu on thi cuoi ky",
    style="unaccented",
    answer="Ôn thi cuối kỳ.",
    citation={
        "doc_id": "E13",
        "quote": "phục vụ ôn thi cuối kỳ",
        "location": "mô tả gói",
    },
    gold=["E13"],
)
_q(
    "EQ23", "evaluation", "sv_an", "answerable",
    "Bộ tài liệu nhóm về hạ tầng gồm những tài liệu nào?",
    "bộ tài liệu nhóm hạ tầng kubernetes mật mã ứng dụng",
    answer="Tài liệu Kubernetes và mật mã ứng dụng.",
    citation={
        "doc_id": "E14",
        "quote": "Gói gồm tài liệu Kubernetes và mật mã ứng dụng cho buổi thuyết trình nhóm.",
        "location": "mô tả gói",
    },
    gold=["E14"],
)
_q(
    "EQ24", "evaluation", "sv_an", "answerable",
    "Gói tài liệu nhóm dùng cho hoạt động nào?",
    "goi tai lieu nhom thuyet trinh",
    style="unaccented",
    answer="Buổi thuyết trình nhóm.",
    citation={
        "doc_id": "E14",
        "quote": "cho buổi thuyết trình nhóm",
        "location": "mô tả gói",
    },
    gold=["E14"],
)
_q(
    "EQ25", "evaluation", "sv_an", "forbidden",
    "Service discovery giải quyết vấn đề gì?",
    "service discovery tim thay dia chi mang",
    style="unaccented",
    answer="Giúp các dịch vụ tìm thấy địa chỉ mạng của nhau.",
    citation={
        "doc_id": "E09",
        "quote": "Service discovery là cơ chế giúp các dịch vụ tìm thấy địa chỉ mạng của nhau.",
        "location": "mục Phần 1",
    },
    forbidden=["E09"],
    note="Tài liệu thuộc G3; sv_an không phải thành viên.",
)
_q(
    "EQ26", "evaluation", "sv_an", "forbidden",
    "Lạm phát cao ảnh hưởng gì đến đồng tiền?",
    "lam phat cao giam suc mua dong tien",
    style="unaccented",
    answer="Làm giảm sức mua.",
    citation={
        "doc_id": "E10",
        "quote": "Lạm phát cao làm giảm sức mua của đồng tiền.",
        "location": "mục Phần 1",
    },
    forbidden=["E10"],
    note="Tài liệu cá nhân của sv_binh.",
)
_q(
    "EQ27", "evaluation", "sv_an", "forbidden",
    "Nhà Lê sơ thành lập năm nào?",
    "nha Le so thanh lap nam 1428",
    style="unaccented",
    answer="Năm 1428.",
    citation={
        "doc_id": "E15",
        "quote": "Nhà Lê sơ thành lập năm 1428 sau khởi nghĩa Lam Sơn.",
        "location": "slide 1",
    },
    forbidden=["E15"],
    note="Tài liệu cá nhân của sv_binh.",
)
_q(
    "EQ28", "evaluation", "sv_an", "no_evidence",
    "Công thức làm bánh mì chả cá gồm những nguyên liệu gì?",
    "công thức bánh mì chả cá nguyên liệu",
    note="Không tài liệu nào trong bộ mẫu chứa công thức nấu ăn.",
)
_q(
    "EQ29", "evaluation", "sv_an", "no_evidence",
    "Lịch thi đấu bóng đá Ngoại hạng Anh vòng 12 thế nào?",
    "lịch thi đấu bóng đá Ngoại hạng Anh vòng 12",
    note="Không có dữ liệu thể thao.",
)
_q(
    "EQ30", "evaluation", "sv_an", "no_evidence",
    "Cách trồng lan hồ điệp trong chậu ra sao?",
    "cách trồng lan hồ điệp trong chậu",
    note="Không có tài liệu nông nghiệp.",
)


def as_dict() -> dict[str, Any]:
    return {
        "dataset_version": DATASET_VERSION,
        "users": USERS,
        "workspaces": WORKSPACES,
        "documents": DOCUMENTS,
        "questions": QUESTIONS,
    }
