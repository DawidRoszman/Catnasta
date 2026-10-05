"use client";
import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { FIRST_MELD_MINIMUMS } from "../lib/cards/draw";

const CARD_VALUES: [string, string][] = [
  ["Joker", "50"],
  ["Ace, Two", "20"],
  ["King down to Eight", "10"],
  ["Seven down to Four, black Three", "5"],
];

const BONUSES: [string, string][] = [
  ["Each red three", "+100"],
  ["Natural Catnasta (no wild cards)", "+500"],
  ["Mixed Catnasta (naturals and wild cards)", "+300"],
  ["Wild Catnasta (only Twos and Jokers)", "+1000"],
  ["Going out (emptying your hand)", "+100"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-lg font-semibold text-cream">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PointsTable({ rows, label }: { rows: [string, string][]; label: string }) {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">{label}</caption>
      <tbody>
        {rows.map(([name, points]) => (
          <tr key={name} className="border-b border-line/60 last:border-0">
            <td className="py-1.5 pr-4">{name}</td>
            <td className="py-1.5 text-right font-mono font-semibold text-brass">{points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const B = ({ children }: { children: React.ReactNode }) => (
  <b className="text-cream">{children}</b>
);

export function DetailedRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Full rules"
      description="Everything the table enforces, from the deal to the final score."
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div
        id="detailed-rules"
        className="-mx-6 max-h-[60vh] space-y-7 overflow-y-auto px-6 text-sm leading-relaxed text-cream-dim"
      >
        <Section title="The deal">
          <p>
            Two players share two standard decks plus four Jokers — 108 cards. Each player is dealt{" "}
            <B>15 cards</B>; the rest form the face-down <B>stock</B>.
          </p>
          <p>
            One card is turned up to start the <B>discard pile</B>. If it&apos;s a wild card or a red
            three, more cards are turned until a regular card shows.
          </p>
        </Section>

        <Section title="Wild cards and threes">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <B>Twos and Jokers are wild</B> and can stand in for any rank in a meld.
            </li>
            <li>
              <B>Red threes</B> never stay in your hand. They&apos;re laid out in front of you
              automatically — at the deal or when drawn — and replaced with a fresh card from the
              stock.
            </li>
            <li>
              <B>Black threes</B> can&apos;t be melded. One on top of the discard pile blocks the
              pile, so discarding one is a safe defensive play.
            </li>
          </ul>
        </Section>

        <Section title="Your turn">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <B>Draw</B> — take the top card of the stock, <i>or</i> take the whole discard pile (see
              below). You must draw before you can discard.
            </li>
            <li>
              <B>Meld</B> (optional) — lay down new melds and add cards to melds you already have.
            </li>
            <li>
              <B>Discard</B> — put one card from your hand on the discard pile. This ends your turn.
            </li>
          </ol>
        </Section>

        <Section title="Melds">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              A meld is <B>three or more cards of the same rank</B>. Suits don&apos;t matter.
            </li>
            <li>
              A meld needs at least <B>two natural cards</B> and may hold at most <B>three wild
              cards</B>. Wild cards must always stay outnumbered by naturals.
            </li>
            <li>
              A meld made entirely of Twos and Jokers is allowed — it&apos;s the start of a wild
              Catnasta.
            </li>
            <li>
              Your <B>first melds</B> each round must reach a minimum that depends on your total from
              earlier rounds (see the table below). You may lay down several melds at once to reach it.
              A meld is worth its lowest card value times the number of cards.
            </li>
            <li>
              You must <B>keep at least one card</B> in your hand after melding, so you can discard.
            </li>
            <li>
              Melds can be extended on later turns with more natural cards of that rank or with wild
              cards, as long as naturals still outnumber wilds.
            </li>
            <li>
              A meld of <B>seven or more cards</B> is a <B>Catnasta</B>.
            </li>
          </ul>
        </Section>

        <Section title="First meld minimum">
          <PointsTable
            rows={FIRST_MELD_MINIMUMS.map(({ label, points }) => [`Total ${label.toLowerCase()}`, String(points)])}
            label="First meld minimum by total score"
          />
        </Section>

        <Section title="Taking the discard pile">
          <p>Instead of drawing from the stock you may take the entire discard pile into your hand if:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>you have already made your first meld,</li>
            <li>the top card isn&apos;t a black three, a Two or a Joker, and</li>
            <li>you hold at least two natural cards of the same rank as the top card.</li>
          </ul>
        </Section>

        <Section title="Rounds and winning">
          <p>A round ends when a player discards and either:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <B>goes out</B> — has no cards left in hand, or
            </li>
            <li>the last card of the stock has been drawn.</li>
          </ul>
          <p>
            Both hands are scored and added to each player&apos;s total. The cards are then reshuffled
            and a new round is dealt, with the other player taking the first turn.
          </p>
          <p>
            The game ends after the round in which a player&apos;s total reaches <B>5,000 points</B>.
            The higher total wins.
          </p>
        </Section>

        <Section title="Card values">
          <PointsTable rows={CARD_VALUES} label="Card values" />
        </Section>

        <Section title="Scoring">
          <p>
            <B>With at least one Catnasta</B>, your score is the value of your melded cards, minus the
            value of the cards left in your hand, plus these bonuses:
          </p>
          <PointsTable rows={BONUSES} label="Bonuses" />
          <p>
            <B>Without a Catnasta</B>, your melds count against you: your score is minus the value of
            your melded cards, minus the value of your hand, plus 100 for each red three.
          </p>
          <p>Red threes are always worth 100 each — there is no extra bonus for collecting all four.</p>
        </Section>

        <Section title="Leaving and disconnecting">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Leaving a table before the game starts simply closes it.</li>
            <li>Leaving a game in progress forfeits it — your opponent wins.</li>
            <li>
              If you lose your connection you have <B>90 seconds</B> to come back to the table before
              the game is forfeited.
            </li>
          </ul>
        </Section>
      </div>
    </Modal>
  );
}

export function DetailedRulesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} id="detailed-rules-button">
        <BookOpen className="h-4 w-4" />Read the full rules
      </Button>
      <DetailedRulesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
