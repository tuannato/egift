# Security notes

eGift is beta software: use small amounts.

## The model

- A gift is an ordinary eCash address whose key is derived, in the browser,
  from a 16-byte random secret carried after the `#` of the link (and, for a
  riddle gift, from the answer as well: PBKDF2-SHA256, 600,000 rounds, salted
  with the secret).
- **Whoever has the link can take the gift.** That includes the giver, any
  chat app or person the link passed through, and anyone who sees a screenshot
  of it. A lost link is a lost gift.
- The site is static. The fragment never reaches a server. No key exists
  before "Create" is pressed, and no key, link, secret or wallet address is
  written to storage, a request, a title or a log. Browser storage holds the
  chosen language and, only by the person's own press, a list of favourite
  wrappers and short records of gifts kept or sent (never a link).
- The chain is read through the public Chronik nodes listed in
  `src/core/chain/chronik.ts`; the Content-Security-Policy allows those hosts
  and one host for token icons, nothing else.

## How it was checked

The code was reviewed internally in three passes (the money core; the network
layer and the build; the interface) and exercised end to end, in November
2026. It has not been audited by an outside firm. The test suite pins the
properties above, among them: no key before "Create", nothing secret in
storage, text from a link or the chain shown as text only, and a link that
was sent keeps naming the same address.

## What others can see

- The chain is public: anyone can see that an address received and sent XEC.
  A gift in a paid wrapper is funded by a transaction that also carries a
  small marker naming the wrapper, so such an address can be recognised as an
  eGift gift.
- A gift link's path names its wrapper (`/snowbox/`), so the host and a chat
  app that draws a preview learn which wrapper a link uses. They never see
  the part after `#`.
- A record you choose to keep in your browser holds the amount, the time and
  the gift's address (only part of it for a gift you received), never the link.
- The link of a riddle gift names the gift's address, so that the page can
  say whether the gift is still there before anyone answers. Whoever has the
  link can therefore look that address up on the chain: what it holds, and
  when it was funded or taken. Nobody signs a link, so what a link says about
  a gift's status is only as good as the hands it passed through. The giver
  can leave the address out ("Hide the gift's status") when making the gift.

None of this gives access to a gift.

## Reporting

If you find a way to take or lose someone's gift, please report it privately
first: open a security advisory on the GitHub repository.
