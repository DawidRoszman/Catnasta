"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  CircleHelp,
  DoorOpen,
  Layers,
  PawPrint,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  WifiOff,
  X,
} from "lucide-react";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { Panel } from "@/app/components/ui/Panel";
import { useToast } from "@/app/components/ui/Feedback";
import Spinner from "@/app/components/ui/Spinner";
import { cn } from "@/app/lib/cn";
import type { Game } from "./gameReducer";
import { FIRST_MELD_MINIMUMS, minimumFirstMeld } from "@/app/lib/cards/draw";

export type Phase = "loading" | "waiting" | "draw" | "play" | "opponent" | "round" | "over" | "closed";

type GameHudProps = {
  game: Game;
  phase: Phase;
  selectedCount: number;
  stagedCount: number;
  onDraw: () => void;
  onPickUp: () => void;
  /** Why the litterbox pile can't be taken, or null when it can. */
  pileProblem: string | null;
  onStageMeld: () => void;
  onConfirmMelds: () => void;
  onDiscard: () => void;
  onClearSelection: () => void;
  onLeave: () => void;
};

export default function GameHud(props: GameHudProps) {
  const { game, phase } = props;
  const [rulesOpen, setRulesOpen] = useState(false);
  const { player1, player2 } = game.gameState;

  return (
    <>
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button id="leave-button" variant="secondary" size="icon" onClick={props.onLeave} aria-label="Leave table">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <GameCode code={game.gameId} />
        </div>

        <div className="pointer-events-auto hidden items-stretch gap-2 md:flex" id="scoreboard">
          <PlayerPlate
            label="You"
            name={player1.name}
            total={player1.total}
            score={player1.score}
            active={phase === "draw" || phase === "play"}
          />
          <StockPlate
            count={game.gameState.stockCardCount}
            round={game.gameState.round}
            winningScore={game.gameState.winningScore}
          />
          <PlayerPlate
            label="Opponent"
            name={player2.name || "Waiting…"}
            total={player2.total}
            cards={player2.name ? player2.num_of_cards_in_hand : undefined}
            active={phase === "opponent"}
            away={Boolean(player2.name) && !game.opponentPresence.online}
          />
        </div>

        <div className="pointer-events-auto">
          <Button id="rules-button" variant="secondary" size="icon" onClick={() => setRulesOpen(true)} aria-label="How to play">
            <CircleHelp className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Action dock */}
      {(phase === "draw" || phase === "play" || phase === "opponent") && <ActionDock {...props} />}

      {(phase === "draw" || phase === "play" || phase === "opponent") &&
        !game.opponentPresence.online && (
          <OpponentAwayBanner name={player2.name} forfeitAt={game.opponentPresence.forfeitAt} />
        )}
      {phase === "waiting" && (
        <WaitingRoom code={game.gameId} opponent={player2.name} onLeave={props.onLeave} />
      )}
      <RoundOverModal game={game} open={phase === "round"} />
      <GameOverModal game={game} open={phase === "over"} />
      <TableClosedModal open={phase === "closed"} host={player2.name} />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
}

function GameCode({ code }: { code: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast("Table code copied — send it to a friend.", { tone: "success" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(`Table code: ${code}`);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="group flex h-10 items-center gap-2 rounded-xl bg-surface/85 px-3 ring-1 ring-line backdrop-blur-md transition-colors hover:ring-brass/60"
      aria-label={`Copy table code ${code}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Table</span>
      <span className="font-mono text-sm font-bold tracking-[0.2em] text-brass" id="game-code">
        {code}
      </span>
      {copied ? (
        <Check className="h-4 w-4 text-mint" />
      ) : (
        <Copy className="h-4 w-4 text-muted group-hover:text-cream" />
      )}
    </button>
  );
}

function PlayerPlate({
  label,
  name,
  total,
  score,
  cards,
  active,
  away = false,
}: {
  label: string;
  name: string;
  total: number;
  /** This round's score so far; only shown for yourself, as it would reveal the opponent's hand. */
  score?: number;
  cards?: number;
  active: boolean;
  away?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-44 items-center gap-3 rounded-xl bg-surface/85 px-3.5 py-2 ring-1 backdrop-blur-md transition-shadow duration-300",
        active ? "ring-brass shadow-glow" : "ring-line",
      )}
    >
      <span
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-lg font-display text-base uppercase",
          active ? "bg-brass text-felt-950" : "bg-felt-600 text-cream-dim",
          away && "opacity-50",
        )}
      >
        {name.charAt(0) || "?"}
        {away && (
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-coral text-felt-950">
            <WifiOff className="h-2.5 w-2.5" aria-hidden />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
          {away ? (
            <span className="ml-1.5 text-coral">· away</span>
          ) : (
            active && <span className="ml-1.5 text-brass">· turn</span>
          )}
        </p>
        <p className="truncate text-sm font-semibold text-cream">{name}</p>
      </div>
      <div className="text-right leading-tight">
        <p className="font-display text-lg font-semibold tabular-nums text-cream" title="Total from finished rounds">
          {total}
        </p>
        {score !== undefined && (
          <p className="text-[11px] tabular-nums text-muted" title="Score in this round so far">
            {score >= 0 ? "+" : ""}
            {score} this round
          </p>
        )}
        {cards !== undefined && <p className="text-[11px] text-muted">{cards} cards</p>}
      </div>
    </div>
  );
}

function StockPlate({
  count,
  round,
  winningScore,
}: {
  count: number;
  round: number;
  winningScore: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl bg-surface/85 px-3 ring-1 ring-line backdrop-blur-md"
      title={`First to ${winningScore.toLocaleString()} points wins`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brass" id="round-number">
        Round {round}
      </p>
      <Layers className="h-4 w-4 text-muted" aria-hidden />
      <p className="font-display text-base font-semibold tabular-nums" id="stock-count">
        {count < 0 ? "–" : count}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted">stock</p>
    </div>
  );
}

const STATUS: Record<"draw" | "play" | "opponent", (game: Game) => string> = {
  draw: () => "Your turn — draw from the stock or take the litterbox pile",
  play: ({ gameState }) =>
    gameState.player1.melds.length === 0
      ? `Your first melds need ${minimumFirstMeld(gameState.player1.total)} points — or just discard`
      : "Select cards to meld, then discard one to end your turn",
  opponent: ({ gameState }) => `${gameState.player2.name} is thinking…`,
};

function ActionDock({
  game,
  phase,
  selectedCount,
  stagedCount,
  onDraw,
  onPickUp,
  pileProblem,
  onStageMeld,
  onConfirmMelds,
  onDiscard,
  onClearSelection,
}: GameHudProps) {
  if (phase !== "draw" && phase !== "play" && phase !== "opponent") {
    return null;
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-4">
      <div
        className="pointer-events-auto flex max-w-full flex-col items-center gap-2 rounded-2xl bg-surface/90 p-2 ring-1 ring-line-strong shadow-card backdrop-blur-xl sm:flex-row sm:gap-3 sm:pl-4"
        id="action-dock"
      >
        <p className="flex items-center gap-2 px-2 text-sm text-cream-dim" aria-live="polite" id="turn-status">
          {phase === "opponent" ? (
            <Spinner className="h-3.5 w-3.5 text-muted" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-brass shadow-[0_0_10px_rgb(227_169_75)]" />
          )}
          {phase === "opponent" && !game.opponentPresence.online
            ? `Waiting for ${game.gameState.player2.name} to come back…`
            : STATUS[phase](game)}
        </p>
        {game.gameState.turnDeadline !== null && (
          <TurnClock
            key={game.gameState.turnDeadline}
            deadline={game.gameState.turnDeadline}
            mine={phase !== "opponent"}
          />
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {phase === "draw" && (
            <>
              <Button onClick={onDraw}>
                <Layers className="h-4 w-4" />Draw
              </Button>
              {/* A disabled button shows no tooltip, so the reason sits on a wrapper. */}
              <span title={pileProblem ?? undefined}>
                <Button variant="secondary" onClick={onPickUp} disabled={pileProblem !== null} id="take-pile">
                  Take pile
                </Button>
              </span>
            </>
          )}
          {phase === "play" && (
            <>
              <Button variant="secondary" onClick={onStageMeld} disabled={selectedCount < 3}>
                <Sparkles className="h-4 w-4" />Stage meld
              </Button>
              {stagedCount > 0 && (
                <Button onClick={onConfirmMelds}>
                  <Check className="h-4 w-4" />Play {stagedCount} meld{stagedCount > 1 ? "s" : ""}
                </Button>
              )}
              <Button variant="danger" onClick={onDiscard} disabled={selectedCount !== 1}>
                <Trash2 className="h-4 w-4" />Discard
              </Button>
            </>
          )}
          {selectedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearSelection} title="Clear selection">
              {`${selectedCount} selected`}
              <X className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function WaitingRoom({
  code,
  opponent,
  onLeave,
}: {
  code: string;
  opponent: string;
  onLeave: () => void;
}) {
  const toast = useToast();
  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("Invite link copied.", { tone: "success" });
    } catch {
      toast(url);
    }
  };
  return (
    <div className="absolute inset-0 grid place-items-center bg-felt-950/45 p-4 backdrop-blur-[2px] animate-fade-in">
      <Panel className="w-full max-w-md p-8 text-center animate-slide-up" id="waiting-room">
        <div className="mx-auto mb-5 flex w-fit gap-2 text-brass" aria-hidden>
          {[0, 1, 2].map((i) => (
            <PawPrint
              key={i}
              className="h-6 w-6 animate-bounce"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
        <h1 className="font-display text-3xl font-semibold">
          {opponent ? "Shuffling the deck…" : "Waiting for an opponent"}
        </h1>
        <p className="mt-2 text-muted">
          {opponent
            ? `${opponent} joined. Dealing the cards.`
            : "Share this table code. The game starts as soon as they sit down."}
        </p>
        <p className="mt-6 font-mono text-4xl font-bold tracking-[0.3em] text-brass">{code}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={share}>
            <Copy className="h-4 w-4" />Copy invite link
          </Button>
          <Button variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </Panel>
    </div>
  );
}

/** Time left in the current turn, with a bar that drains to the deadline. */
function TurnClock({ deadline, mine }: { deadline: number; mine: boolean }) {
  const seconds = useSecondsUntil(deadline);
  // Measured once; the bar drains in CSS.
  const [total] = useState(() => Math.max(0, (deadline - Date.now()) / 1000));
  const urgent = seconds <= 10;
  return (
    <div
      id="turn-timer"
      role="timer"
      aria-label={`${seconds} seconds left in ${mine ? "your" : "this"} turn`}
      className={cn(
        "relative flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-3 font-mono text-sm font-semibold tabular-nums ring-1",
        urgent ? "bg-coral/15 text-coral ring-coral/50" : "bg-white/5 text-cream ring-line",
        urgent && mine && "animate-pulse",
      )}
    >
      <Timer className="h-4 w-4" aria-hidden />
      {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left", urgent ? "bg-coral" : "bg-brass")}
        style={{ animation: `drain ${total}s linear forwards` }}
      />
    </div>
  );
}

function useSecondsUntil(epochMs: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!epochMs) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [epochMs]);
  return epochMs ? Math.max(0, Math.ceil((epochMs - now) / 1000)) : 0;
}

function RoundOverModal({ game, open }: { game: Game; open: boolean }) {
  const result = game.roundResult;
  const seconds = useSecondsUntil(open ? result?.nextRoundAt : undefined);
  if (!result) {
    return null;
  }
  const me = game.gameState.player1.name;
  const rows = [...result.results].sort((a, b) => (a.name === me ? -1 : b.name === me ? 1 : 0));
  const target = game.gameState.winningScore;
  return (
    <Modal
      open={open}
      dismissible={false}
      title={`Round ${result.round} complete`}
      description={`First to ${target.toLocaleString()} points wins the game.`}
      footer={
        <p className="flex items-center gap-2 text-sm text-muted" id="next-round-countdown">
          <Spinner className="h-3.5 w-3.5" />
          {seconds > 0 ? `Dealing round ${result.round + 1} in ${seconds}s…` : "Dealing…"}
        </p>
      }
    >
      <table className="w-full text-left text-sm" id="round-results">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-muted">
            <th className="pb-2 font-semibold">Player</th>
            <th className="pb-2 text-right font-semibold">This round</th>
            <th className="pb-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-line/60">
              <td className="py-2 font-semibold text-cream">
                {row.name}
                {row.name === me && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
              </td>
              <td
                className={cn(
                  "py-2 text-right font-mono tabular-nums",
                  row.points < 0 ? "text-coral" : "text-mint",
                )}
              >
                {row.points >= 0 ? "+" : ""}
                {row.points}
              </td>
              <td className="py-2 text-right font-display text-xl font-semibold tabular-nums text-brass">
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

function GameOverModal({ game, open }: { game: Game; open: boolean }) {
  const router = useRouter();
  const { winner, loser, reason, forfeitedBy } = game.gameResult;
  const me = game.gameState.player1.name;
  const youWon = winner?.name === me;
  const forfeit = reason === "forfeit" || reason === "left";
  const description = !forfeit
    ? youWon
      ? "A purr-fect game."
      : "Good game — shuffle up and try again."
    : forfeitedBy === me
      ? "You left the table, so the game was forfeited."
      : reason === "left"
        ? `${forfeitedBy} left the table — you win by forfeit.`
        : `${forfeitedBy} didn't come back in time — you win by forfeit.`;
  return (
    <Modal
      open={open}
      dismissible={false}
      title={
        <span className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-brass" />
          {youWon ? "You win!" : `${winner?.name ?? "Your opponent"} wins`}
        </span>
      }
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Home
          </Button>
          <Button onClick={() => router.push("/game")}>Back to lobby</Button>
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-3" id="game-results">
        {[winner, loser].map(
          (player, i) =>
            player && (
              <div
                key={player.name}
                className={cn(
                  "rounded-xl p-4 ring-1",
                  i === 0 ? "bg-brass/10 ring-brass/40" : "bg-white/5 ring-line",
                )}
              >
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {i === 0 ? "Winner" : "Runner-up"}
                </dt>
                <dd className="mt-1 truncate font-semibold">{player.name}</dd>
                <dd className="font-display text-3xl font-semibold tabular-nums">{player.points}</dd>
              </div>
            ),
        )}
      </dl>
    </Modal>
  );
}

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="How to play"
      description="Catnasta plays like Canasta — meld cards of the same rank and empty your hand."
      footer={<Button onClick={onClose}>Got it</Button>}
    >
      <div className="grid gap-6 text-sm text-cream-dim sm:grid-cols-2">
        <section>
          <h3 className="mb-2 font-semibold text-cream">Your turn</h3>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <b className="text-cream">Draw</b> — click the stock, or take the whole litterbox pile.
            </li>
            <li>
              <b className="text-cream">Meld</b> — click cards in your hand to select them, stage
              groups of three or more, then play them. Click one of your melds to add selected cards.
            </li>
            <li>
              <b className="text-cream">Discard</b> — select one card and click the litterbox to end your
              turn.
            </li>
          </ol>
        </section>
        <section>
          <h3 className="mb-2 font-semibold text-cream">Good to know</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Twos and Jokers are wild — at most three per meld, never more than the naturals.</li>
            <li>One meld per rank: more cards of a rank you&apos;ve melded join that meld.</li>
            <li>
              Your first melds each round need{" "}
              {FIRST_MELD_MINIMUMS.map(({ points }) => points).join(" / ")} points, depending on
              your total.
            </li>
            <li>Rounds continue until someone reaches the table&apos;s target score.</li>
            <li>
              On a timed table, running out of time draws a card for you (if you hadn&apos;t yet) and
              discards your lowest card.
            </li>
            <li>A meld of seven or more cards is a <b className="text-brass">Catnasta</b>.</li>
            <li>
              To take the litterbox pile you need two naturals matching its top card; those three cards
              are melded straight away, then you discard as usual. If it matches one of your catnastas,
              you must take it instead of drawing: the card joins the catnasta.
            </li>
            <li>Red threes score 100 bonus points; a black three on the pile blocks it.</li>
            <li>
              Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Esc</kbd> to
              clear your selection.
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

function OpponentAwayBanner({ name, forfeitAt }: { name: string; forfeitAt: number | null }) {
  // Keyed by the deadline so this is measured once; the bar drains in CSS
  // rather than re-rendering every second.
  return <AwayBannerContent key={forfeitAt ?? "none"} name={name} forfeitAt={forfeitAt} />;
}

function AwayBannerContent({ name, forfeitAt }: { name: string; forfeitAt: number | null }) {
  const [seconds] = useState(() =>
    forfeitAt === null ? null : Math.max(0, Math.round((forfeitAt - Date.now()) / 1000)),
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4 md:top-24">
      <div
        id="opponent-away"
        role="status"
        className="pointer-events-auto relative max-w-lg overflow-hidden rounded-2xl bg-surface/95 ring-1 ring-coral/50 shadow-card backdrop-blur-md animate-pop-in"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <WifiOff className="h-5 w-5 shrink-0 text-coral" aria-hidden />
          <p className="text-sm text-cream-dim">
            <span className="font-semibold text-cream">{`${name} isn't at the table.`}</span>{" "}
            {seconds !== null
              ? `If they don't return within ${formatDuration(seconds)}, you win by forfeit.`
              : "Waiting for them to return…"}
          </p>
        </div>
        {seconds !== null && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-coral"
            style={{ animation: `drain ${seconds}s linear forwards` }}
          />
        )}
      </div>
    </div>
  );
}

function TableClosedModal({ open, host }: { open: boolean; host: string }) {
  const router = useRouter();
  return (
    <Modal
      open={open}
      dismissible={false}
      title={
        <span className="flex items-center gap-3">
          <DoorOpen className="h-7 w-7 text-brass" />
          Table closed
        </span>
      }
      description={`${host || "The host"} closed this table before the game started.`}
      footer={<Button onClick={() => router.push("/game")}>Back to lobby</Button>}
    />
  );
}
