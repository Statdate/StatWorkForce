import { sendMessageAction } from "@/app/actions/messages";

export function MessageThread({
  messages,
  currentUserId,
  recipientId,
  recipientName,
  returnPath,
}: {
  messages: { id: string; senderId: string; body: string; sentAt: Date }[];
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  returnPath: string;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="font-medium text-slate-900">{recipientName}</p>
      </div>
      <div className="max-h-[420px] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                  isMine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 text-[10px] ${isMine ? "text-slate-300" : "text-slate-400"}`}>
                  {m.sentAt.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">No messages yet — say hello.</p>
        )}
      </div>
      <form action={sendMessageAction} className="flex gap-2 border-t border-slate-200 p-3">
        <input type="hidden" name="recipientId" value={recipientId} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <input
          type="text"
          name="body"
          placeholder="Type a message..."
          required
          autoComplete="off"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
