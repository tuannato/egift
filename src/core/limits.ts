/** The numbers the rules rest on. Amounts are satoshis; 1 XEC = 100 sats. */

/** The node's dust limit for a P2PKH output. Less than this never arrives. */
export const DUST_SATS = 546n;

/** Fee rate: 1 sat per byte, what Cashtab and the node's relay policy use. */
export const FEE_PER_KB = 1000n;

/**
 * The least a package may be created with: 10 XEC. Taking it home costs about
 * 2 XEC and at least 5.46 XEC must arrive.
 */
export const FLOOR_SATS = 1000n;

/**
 * There is no cap on a gift (owner's decision, 2026-11-12). The only bound
 * left is the total XEC supply, which an amount cannot exceed anyway.
 */
export const CAP_SATS = 2_100_000_000_000_000n;

/**
 * From this amount up — 1,000,000 XEC — the page asks the giver to confirm
 * before it creates the gift. Below it, the giver may still switch the same
 * confirmation on for any gift. A gift link is the money: whoever has it can
 * take it, and the page's code touches the key.
 */
export const CONFIRM_SATS = 100_000_000n;

/** The wish, in UTF-8 bytes. 180 bytes is 240 characters of base64url, which keeps the QR scannable. */
export const WISH_MAX_BYTES = 180;

/** The question of a riddle lock, in UTF-8 bytes. */
export const RIDDLE_MAX_BYTES = 120;

/**
 * Rounds of PBKDF2-SHA256 between a riddle's answer and the key: slow enough
 * that opening takes a moment, on purpose.
 */
export const RIDDLE_ROUNDS = 600_000;

/** The wrapper a link falls back to when it names one this build does not have. */
export const DEFAULT_WRAPPER = 'signal';

/**
 * Most inputs one sweep spends. 600 P2PKH inputs is about 85 kB; the node
 * refuses to relay a transaction over 100 kB, so a bigger sweep could never
 * arrive. Coins beyond this wait for another round (`Sweep.leftCoins`).
 */
export const MAX_SWEEP_INPUTS = 600;

/** The most coins of one token that go into one sweep (the largest first). */
export const MAX_TOKEN_INPUTS = 100;
