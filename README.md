# Catnasta

## Introduction

Introducing Catnasta, the feline-inspired twist on the classic card game Canasta! In this purr-fectly delightful adaptation, players will find themselves immersed in a world of whiskers and tails as they enjoy the strategic gameplay with a cat-centric twist.

Catnasta retains the fundamental principles of Canasta, but with a charming alteration—each card features adorable illustrations of various cats.

## Rules

### Overview

Playing Canasta usually requires two sets of cards holding 52 cards each and four Jokers. That checks out at 108 cards in the game. There are 13 ranks – from Two to Ten, Jack, Queen, King, and Ace. They all appear in the four suits Clubs, Spades, Hearts, and Diamonds.

At the beginning of the round each player recieves 15 cards (the host can pick anywhere from 9 to 17 when dealing the table). The leftover cards become the stock. One card is revealed from the stock pile and is now the base of the discard pile. If a wild card or a bonus card appears here, another card is drawn and discarded until this is not the case anymore.

### Natural Cards

These are Aces, Kings, Queens, Jacks, and the pip cards from Ten down to Four. They are only used in melds and are grouped into lower-value cards (Four to Seven) and higher-value cards (Eight to King and Ace).

### Bonus Cards

Bonus cards have no function beyond yielding bonus points. In Canasta, these are the red Threes. When you receive a red three by dealing or drawing, it is automatically placed face-up in the playing field. You receive a supplement card. Red Threes score 100 bonus points. These points cannot be used for your first meld. If you or your team collects all red threes of a round, you gain 400 additional bonus points. But if your team couldn’t play any melds by the end of the round, all points for red Threes are turned into negative points.

While dealing the cards and setting up the playing field, a red Three can end up in the discard pile. In that case, the next card is drawn from the stock and placed on top of the red Three until a natural card or a block card is on top. A red Three in the discard pile remains visible since it is placed there rotated by 90°. If you pick up the discard pile with a red Three, the bonus card is automatically placed in your melding area and will not be replaced in your hand.

### Block Cards

The black Threes are block cards. When a black Three is on top of the discard pile, it is blocked, and the next player can only draw from the stock. They cannot draw from the discard pile, add a single card from there to their melds, or pick up the whole discard pile.

### Wild Cards

In Canasta, the four regular Jokers and all Twos are wild cards. They help with forming melds since wild cards can replace other cards of any rank in melds. Two Kings could form a correct meld with a Joker, for example. Discarded wild cards freeze the discard pile: As long as a wild card is in the discard pile, you can only pick it up by using the top for a meld with at least two natural cards from your hand. In addition, the discard pile is blocked as long as the wild card lies on top.

### Points

- Joker - 50 points
- Twos and Aces - 20 points
- Red Threes - 100 points
- Black Threes - 5 points
- Eight, Nine, Ten, Jack, Queen, King - 10 points
- Four, Five, Six, Seven - 5 points

### Melds

- A meld must consist of at least three cards of the same rank.
- The same card can be repeated within a meld (2x Ace of Hearts, for example).
- There is no limit to the number of cards in a meld.
- A maximum of three wild cards can be in a meld.
- Wild cards must not outnumber natural cards.
- Each player has at most one meld per rank; melding more cards of a rank already on the table adds them to that meld.
- Once melded, wild cards cannot be swapped or picked up again.
- **You cannot add cards to your opponent’s melds**.
- Black Threes can be melded only before going out.

### Conditions for the First Meld

Each round, player's initial meld **must score a minimum number of points**. This minimum threshold depends on the player's current total score:

| Current Score  | Min Score for First Meld |
| -------------- | ------------------------ |
| Below 1500     | 30                       |
| 1500 to 3000   | 90                       |
| 3000 and above | 120                      |

### Course of Action During a Turn

1. The player can either draw a card from the stock or, if conditions are met, pick up the whole discard pile.
2. The player can now play new melds or add cards to their party’s existing melds. If the player’s team has no melds yet, a minimum score must be reached with the initial meld.
3. When the player is done with all actions, they must discard a card from their hand, and it’s the next player’s turn. The discard pile can be blocked or frozen for the following players by discarding a block card or a wild card. If a player goes out, they may skip this step.

### Picking up the Discard Pile

The fight for the discard pile is one of Canasta’s key elements. Players can strategically prevent opponents from picking up the discard pile. The taller the pile is, the more suspenseful the fight. If you get to pick up the pile, you can feel victorious: You gained many cards and, potentially, complete canastas. The opportunity to pick up a tall discard pile can decide the game. Picking up the discard pile is also called buying.

- You can pick up the discard pile only after you completed the first meld
- When buying the discard pile, its top card is immediately melded with two natural cards of the same rank from your hand (joining your meld of that rank if you have one). You must still have a card left to discard.
- If the top card of the discard pile is a black Three or a wild card, you cannot pick up the discard pile. It is blocked.

### Going out - Ending a Round of Canasta

Ending the round is called going out in Canasta. That is done by playing all your hand cards. You have to discard the last one. Remember, you can only go out if you melded at least one canasta by the end of your final turn and there is at least one meld on your table.

A round also ends when there are no more cards in the draw pile. In that case, points are counted with neither party going out.

### Evaluation in Canasta – Counting Points

Once a round ended, the scores are determined as follows:

|                  |                                             |
| ---------------- | ------------------------------------------- |
| Played melds     | Sum of the cards' scores                    |
| Hand cards       | Sum of the cards' scores as negative points |
| Going out        | 100 points                                  |
| Natural canastas | 500 points each                             |
| Mixed Canastas   | 300 points each                             |
| Wild Canasta     | 1000 points                                 |
| Red Threes       | 100 points each                             |

### End of the game 

Game ends when one player reaches 5000 points. The player with highest total score wins.

[Rules inspired by Canasta-Palace](https://www.canasta-palace.com/a-quick-explanation-of-canasta/)

## Running it

The whole stack (MongoDB, API and frontend) runs with Docker:

```sh
docker compose up -d --build
```

The frontend is served at http://localhost:3000 and the API at http://localhost:5001.

## Deploying

`docker-compose.prod.yml` runs production builds and publishes no ports. It's
set up for [Dokploy](https://dokploy.com): the frontend joins Dokploy's
`dokploy-network`, where its Traefik proxy routes your domain. The frontend
proxies `/api/*` and the `/ws` WebSocket to the API over an internal-only
network, so the API and MongoDB are never reachable from outside.

1. Create a **Docker Compose** service in Dokploy from this repository and set
   the compose path to `docker-compose.prod.yml`.
2. In **Environment**, set the variables from `.env.example`
   (`TOKEN_SECRET`: `openssl rand -hex 32`).
3. In **Domains**, add your domain for service `frontend`, port `3000`.
4. In Cloudflare, point an `A` record for the domain at the Dokploy server.
   WebSockets work through Cloudflare's proxy without extra setup.

Redeploying doesn't end games in progress. The API saves every live game to
MongoDB (`live_games`) as it changes and once more when it gets `SIGTERM`, then
restores them on startup. Turn clocks and round breaks carry on with the time
they had left, and players' tables reconnect and catch up on their own.

To run it locally, create the network once with
`docker network create dokploy-network`, copy `.env.example` to `.env`, and run
`docker compose -f docker-compose.prod.yml up -d --build`.

## End-to-end tests

The [Playwright](https://playwright.dev) tests in `e2e/` cover the landing page, sign up and log in, dealing tables (with options, private and from invite links), playing a turn on the 3D board, leaving and forfeiting, the turn timer, the full rules and the lobby chat. With the stack running, run them in headless Chromium:

```sh
./e2e/run.sh                 # all tests (installs dependencies and Chromium on first run)
./e2e/run.sh auth            # tests whose file name matches "auth"
./e2e/run.sh --headed        # watch them in a browser window
```

Set `BASE_URL` and `API_URL` to point the tests at another environment. Failures keep a trace and a screenshot in `e2e/test-results/`, and `pnpm --dir e2e report` opens the HTML report.
