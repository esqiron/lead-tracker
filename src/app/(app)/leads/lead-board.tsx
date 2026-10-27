"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Alert, cx } from "@/components/ui";
import { formatMoney, initials } from "@/lib/format";
import { moveLead } from "./actions";
import { LostReasonDialog } from "./lost-reason-dialog";

export type BoardStage = { id: string; name: string; probability: number; is_won: boolean; is_lost: boolean };
export type BoardCard = {
  id: string;
  title: string;
  amount: number;
  stageId: string;
  subtitle: string;
  ownerName: string;
  closeDate: string;
  overdue: boolean;
};

export function LeadBoard({
  stages,
  cards,
  currency,
  canEdit,
}: {
  stages: BoardStage[];
  cards: BoardCard[];
  currency: string;
  canEdit: boolean;
}) {
  const [optimisticCards, applyMove] = useOptimistic(cards, (state, move: { id: string; stageId: string }) =>
    state.map((c) => (c.id === move.id ? { ...c, stageId: move.stageId } : c)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<{ id: string; stageId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = (id: string, stageId: string, reason?: string) => {
    setError(null);
    startTransition(async () => {
      applyMove({ id, stageId });
      const result = await moveLead(id, stageId, reason);
      if (result.error) setError(result.error);
    });
  };

  const drop = (stage: BoardStage) => {
    const id = dragging;
    setDragging(null);
    setOverStage(null);
    if (!id) return;
    const card = optimisticCards.find((c) => c.id === id);
    if (!card || card.stageId === stage.id) return;
    if (stage.is_lost) setPendingLost({ id, stageId: stage.id });
    else commit(id, stage.id);
  };

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-3">
          {stages.map((stage) => {
            const inStage = optimisticCards.filter((c) => c.stageId === stage.id);
            const total = inStage.reduce((sum, c) => sum + c.amount, 0);
            return (
              <section
                key={stage.id}
                aria-label={stage.name}
                onDragOver={(e) => {
                  if (!canEdit || !dragging) return;
                  e.preventDefault();
                  setOverStage(stage.id);
                }}
                onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(stage);
                }}
                className={cx(
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-zinc-50 dark:bg-zinc-900/50",
                  overStage === stage.id ? "border-zinc-900 dark:border-zinc-300" : "border-zinc-200 dark:border-zinc-800",
                )}
              >
                <header className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2">
                  <h2 className="flex items-center gap-2 text-sm font-medium">
                    {stage.is_won ? <span aria-hidden className="size-2 rounded-full bg-emerald-500" /> : null}
                    {stage.is_lost ? <span aria-hidden className="size-2 rounded-full bg-zinc-400" /> : null}
                    {stage.name}
                    <span className="font-normal text-zinc-500">{inStage.length}</span>
                  </h2>
                  <span className="text-xs tabular-nums text-zinc-500">{formatMoney(total, currency)}</span>
                </header>
                <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                  {inStage.map((card) => (
                    <li key={card.id}>
                      <Link
                        href={`/leads/${card.id}`}
                        draggable={canEdit}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", card.id);
                          setDragging(card.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setOverStage(null);
                        }}
                        className={cx(
                          "block rounded-lg border border-zinc-200 bg-white p-3 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
                          canEdit && "cursor-grab active:cursor-grabbing",
                          dragging === card.id && "opacity-50",
                        )}
                      >
                        <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{card.title}</p>
                        {card.subtitle ? <p className="mt-0.5 truncate text-xs text-zinc-500">{card.subtitle}</p> : null}
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatMoney(card.amount, currency)}
                          </span>
                          <span className="flex items-center gap-2 text-zinc-500">
                            {card.closeDate ? (
                              <span className={card.overdue ? "text-amber-700 dark:text-amber-400" : undefined}>{card.closeDate}</span>
                            ) : null}
                            {card.ownerName ? (
                              <span
                                title={card.ownerName}
                                className="grid size-5 place-items-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {initials(card.ownerName)}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      <LostReasonDialog
        open={pendingLost !== null}
        leadTitle={optimisticCards.find((c) => c.id === pendingLost?.id)?.title}
        onCancel={() => setPendingLost(null)}
        onConfirm={(reason) => {
          if (pendingLost) commit(pendingLost.id, pendingLost.stageId, reason);
          setPendingLost(null);
        }}
      />
    </div>
  );
}
