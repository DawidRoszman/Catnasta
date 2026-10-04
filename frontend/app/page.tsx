import dynamic from "next/dynamic";
import PlayPanel from "./components/PlayPanel";
import Chat from "./components/Chat";
import PlayingCard from "./components/PlayingCard";
import { Rank, Suit } from "./game/[slug]/components/gameReducer";
import type { PlayingCard as Card } from "./lib/cards/draw";

const HeroCards = dynamic(() => import("./components/HeroCards"));

const SCORING: { label: string; points: string; cards: Card[] }[] = [
  { label: "Joker", points: "50", cards: [{ id: "s-j", rank: "JOKER", suit: "BLACK" }] },
  {
    label: "Aces & Twos",
    points: "20",
    cards: [
      { id: "s-a", rank: Rank.ACE, suit: Suit.HEART },
      { id: "s-2", rank: Rank.TWO, suit: Suit.SPADE },
    ],
  },
  {
    label: "Eight to King",
    points: "10",
    cards: [
      { id: "s-k", rank: Rank.KING, suit: Suit.DIAMOND },
      { id: "s-8", rank: Rank.EIGHT, suit: Suit.CLUB },
    ],
  },
  {
    label: "Four to Seven",
    points: "5",
    cards: [
      { id: "s-7", rank: Rank.SEVEN, suit: Suit.SPADE },
      { id: "s-4", rank: Rank.FOUR, suit: Suit.HEART },
    ],
  },
  { label: "Red Three", points: "100", cards: [{ id: "s-3r", rank: Rank.THREE, suit: Suit.HEART }] },
  { label: "Black Three", points: "5", cards: [{ id: "s-3b", rank: Rank.THREE, suit: Suit.CLUB }] },
];

const STEPS = [
  {
    title: "Draw",
    body: "Take the top card of the stock — or, once you've melded, scoop up the whole discard pile.",
  },
  {
    title: "Meld",
    body: "Lay down three or more cards of the same rank. Twos and Jokers are wild. Seven cards make a Catnasta.",
  },
  {
    title: "Discard",
    body: "End your turn by discarding one card. Go out first, or simply score the most points.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div className="animate-slide-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brass/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brass ring-1 ring-brass/30">
            A feline twist on Canasta
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Meld, discard,
            <br />
            <span className="italic text-brass">purr.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-cream-dim">
            Catnasta is the classic two-player rummy game dealt on a velvet 3D table — with a deck
            full of cats wearing crowns.
          </p>
          <div className="mt-8 max-w-lg">
            <PlayPanel />
          </div>
        </div>
        <HeroCards />
      </section>

      <section id="rules" className="scroll-mt-20 border-t border-line/60 bg-felt-900/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-semibold tracking-tight">How a turn works</h2>
            <p className="mt-3 text-cream-dim">
              Two players, two decks, four Jokers. Each player starts with fifteen cards.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-surface/70 p-6 ring-1 ring-line">
                <span className="font-display text-5xl font-semibold text-brass/80">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{step.body}</p>
              </li>
            ))}
          </ol>

          <h2 className="mt-20 font-display text-3xl font-semibold tracking-tight">Card values</h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SCORING.map((item) => (
              <li key={item.label} className="flex flex-col items-center rounded-2xl bg-surface/70 p-4 ring-1 ring-line">
                <div className="flex h-[112px] items-center -space-x-8">
                  {item.cards.map((card, i) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      width={72}
                      className={i === 1 ? "rotate-6" : item.cards.length > 1 ? "-rotate-6" : ""}
                    />
                  ))}
                </div>
                <p className="mt-3 font-display text-2xl font-semibold text-brass">{item.points}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{item.label}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            Collect all four red threes for a 400 point bonus — but if you haven&apos;t melded by the
            end of the round, red threes count against you.
          </p>
        </div>
      </section>
      <Chat />
    </main>
  );
}
