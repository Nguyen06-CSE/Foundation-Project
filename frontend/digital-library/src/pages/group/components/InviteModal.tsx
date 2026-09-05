import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { groupService } from "@/services/groupService";
import type { InviteModalProps } from "../types/groupSpace.types";

export default function InviteModal({ groupId, onClose }: InviteModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const invite = useMutation({
    mutationFn: () => groupService.invite(groupId, { identifier, message }),
    onSuccess: onClose,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Mời thành viên
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Tìm theo MSSV, email hoặc username..."
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <textarea
            className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Lời nhắn (tuỳ chọn)"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button
            disabled={!identifier.trim() || invite.isPending}
            onClick={() => invite.mutate()}
          >
            Gửi lời mời
          </Button>
        </div>
      </Card>
    </div>
  );
}
