import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useHighlightElement(paramName = "highlight_doc", customPrefix?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get(paramName);

  useEffect(() => {
    if (!highlightId) return;

    const prefix =
      customPrefix ??
      (paramName.includes("group")
        ? "group-"
        : paramName.includes("submission")
          ? "submission-"
          : paramName.includes("todo")
            ? "todo-"
            : "doc-");

    const targetId = `${prefix}${highlightId}`;
    let observer: MutationObserver | null = null;
    let removeHighlightTimer: ReturnType<typeof setTimeout> | null = null;
    let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
    let targetElement: HTMLElement | null = null;

    // Viền đen nổi bật chỉ áp dụng cho tài liệu (prefix === "doc-")
    // Giữ nguyên style primary ring và background hiện có cho group, submission và todo
    const isDocHighlight = prefix === "doc-";
    const highlightClasses = isDocHighlight
      ? [
          "ring-4",
          "ring-black",
          "ring-offset-2",
          "transition-all",
          "duration-300",
        ]
      : [
          "ring-4",
          "ring-primary-400",
          "bg-primary-50",
          "transition-all",
          "duration-500",
        ];

    const cleanupParam = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(paramName);
          return next;
        },
        { replace: true }
      );
    };

    const applyHighlight = (el: HTMLElement) => {
      targetElement = el;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (maxWaitTimer) {
        clearTimeout(maxWaitTimer);
        maxWaitTimer = null;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(...highlightClasses);

      removeHighlightTimer = setTimeout(() => {
        el.classList.remove(...highlightClasses);
        cleanupParam();
      }, 2500);
    };

    // 1. Kiểm tra ngay nếu phần tử đã có sẵn trong DOM; nếu chưa có thì dùng MutationObserver chờ bền vững
    const existing = document.getElementById(targetId);
    if (existing) {
      applyHighlight(existing);
    } else {
      observer = new MutationObserver(() => {
        const found = document.getElementById(targetId);
        if (found) {
          applyHighlight(found);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Giới hạn thời gian chờ tối đa 5000ms để dọn dẹp nếu phần tử không xuất hiện
      maxWaitTimer = setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        cleanupParam();
      }, 5000);
    }

    return () => {
      if (observer) observer.disconnect();
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      if (removeHighlightTimer) clearTimeout(removeHighlightTimer);
      if (targetElement) {
        targetElement.classList.remove(...highlightClasses);
      }
    };
  }, [highlightId, paramName, customPrefix, setSearchParams]);
}
