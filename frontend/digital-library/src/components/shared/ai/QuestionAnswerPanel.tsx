// src/components/shared/ai/QuestionAnswerPanel.tsx

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { insightService } from "@/services/insightService";
import { requestErrorLabel } from "@/utils/requestErrorLabel";
import { cn } from "@/utils/cn";
import { CitationCard } from "./CitationCard";

interface QuestionAnswerPanelProps {
  documentId: number;
  initialQuestion?: string;
  className?: string;
}

interface AnswerRequestResult {
  data: Awaited<ReturnType<typeof insightService.askQuestion>> | null;
  error: string | null;
  elapsedMs: number;
}

export function QuestionAnswerPanel({
  documentId,
  initialQuestion = "",
  className,
}: QuestionAnswerPanelProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const answer = useMutation({
    mutationFn: async (value: string): Promise<AnswerRequestResult> => {
      const startedAt = performance.now();
      try {
        const data = await insightService.askQuestion(documentId, value);
        return { data, error: null, elapsedMs: performance.now() - startedAt };
      } catch (error) {
        return {
          data: null,
          error: requestErrorLabel(error),
          elapsedMs: performance.now() - startedAt,
        };
      }
    },
    retry: false,
  });

  const result = answer.data;
  const elapsedLabel = result
    ? ` (${(result.elapsedMs / 1000).toFixed(1)}s)`
    : "";
  const isRetrying = result?.data?.index_status === "retry";

  return (
    <section
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-900">Hỏi đáp cùng AI</h3>
        {result && <span className="text-xs text-gray-400">{elapsedLabel.trim()}</span>}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = question.trim();
          if (trimmed) {
            answer.reset();
            answer.mutate(trimmed);
          }
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Đặt câu hỏi về nội dung đã tìm kiếm..."
          className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!question.trim() || answer.isPending}
          icon={
            answer.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )
          }
        >
          {answer.isPending ? "Đang trả lời" : "Hỏi"}
        </Button>
      </form>

      {result?.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {`Không thể trả lời: ${result.error}${elapsedLabel}. Vui lòng thử lại.`}
        </p>
      )}

      {result?.data && (
        <div className="mt-3 space-y-3">
          {result.data.status === "not_ready" ? (
            <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              {isRetrying
                ? "Lập chỉ mục đang thử lại; chưa thể trả lời câu hỏi này."
                : "Tài liệu đang chờ lập chỉ mục; chưa thể trả lời câu hỏi này."}
            </p>
          ) : result.data.status === "insufficient" || !result.data.answer ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              Chưa đủ căn cứ trong tài liệu để trả lời câu hỏi này.
            </p>
          ) : (
            <p className="rounded-lg bg-primary-50/50 p-3 text-sm leading-relaxed text-gray-800">
              {result.data.answer}
            </p>
          )}

          {result.data.status !== "not_ready" && result.data.citations.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Nguồn trích dẫn
              </p>
              {result.data.citations.map((citation, index) => (
                <CitationCard
                  key={`${citation.chunk_id ?? citation.document_id}-${index}`}
                  citation={citation}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default QuestionAnswerPanel;
