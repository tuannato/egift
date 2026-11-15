/**
 * The contract between the core (keys, links, transactions, chain) and the
 * frame UI. Everything here is plain data; nothing in this file touches a
 * key or the network.
 *
 * Units: amounts are satoshis as `bigint`. 1 XEC = 100 sats.
 */

/** What a Gift link carries. Everything lives after `#` and never reaches a server. */
export interface PackageLink {
    readonly version: 1;
    /** 16 random bytes. This IS the gift: whoever has it can take the package. */
    readonly secret: Uint8Array;
    /** Id of a built-in wrapper (`src/wrappers`). Unknown ids fall back to the default wrapper. */
    readonly wrapper: string;
    /** Path B (not built yet): the item the package may buy, and the most it may pay. */
    readonly item?: { readonly tokenId: string; readonly maxSats: bigint };
    /** Workshop tier 1 (not built yet): a small recipe string, `[A-Za-z0-9_-]*`. */
    readonly recipe?: string;
    /** The giver's wish, free text. At most `WISH_MAX_BYTES` UTF-8 bytes. Untrusted. */
    readonly wish?: string;
    /**
     * The question of a riddle lock, free text. At most `RIDDLE_MAX_BYTES`
     * UTF-8 bytes. Untrusted. When present, the secret alone opens nothing:
     * the key is derived from the secret and the answer (`unlockKey`).
     */
    readonly riddle?: string;
}

/** The one-time key of a package, derived from the link's secret. */
export interface PackageKey {
    readonly sk: Uint8Array;
    readonly pk: Uint8Array;
    /** HASH160 of `pk`, 20 bytes. */
    readonly pkh: Uint8Array;
    /** `ecash:q…` P2PKH address of the package. */
    readonly address: string;
}

/**
 * The token kinds this page moves: ALP standard, SLP fungible, an SLP NFT
 * (NFT1 child). Anything else is `other` and is never touched.
 */
export type TokenKind = 'alp' | 'slp' | 'nft';

/** What a token coin carries, as the node coloured it. */
export interface CoinToken {
    readonly tokenId: string;
    readonly kind: TokenKind | 'other';
    /** The amount in atoms (base units). */
    readonly atoms: bigint;
    /** A mint baton: the right to make more. Never moved. */
    readonly baton: boolean;
}

/** One unspent output sitting at the package address. */
export interface Coin {
    readonly txid: string;
    readonly outIdx: number;
    readonly sats: bigint;
    /** True when the output carries a token. A token coin is never spent as fee. */
    readonly token: boolean;
    /**
     * What the token is, when the chain says. Beside `token`, never instead
     * of it: `buildSweep` goes by `token` alone and must keep leaving every
     * token coin where it is.
     */
    readonly tokenInfo?: CoinToken;
    /** True once the transaction that created it is final (avalanche or a final block). */
    readonly final: boolean;
    /** Block height of the transaction that created it; absent while it is unconfirmed or when the chain does not say. */
    readonly height?: number;
}

/** A transaction's scripts and amounts, as the chain reports them. Scripts are lowercase hex. */
export interface TxDetail {
    /** The scripts the inputs spend FROM (the previous outputs' scripts); '' when unknown. */
    readonly inputs: readonly string[];
    readonly outputs: readonly { readonly sats: bigint; readonly script: string }[];
}

/**
 * What the chain says about a package address, read fresh.
 *
 * - `empty`: the address has never received anything.
 * - `funded`: it holds at least one non-token (XEC) coin: there is something to take.
 * - `taken`: it has history and holds no XEC coin: someone took the package home.
 *   It may still hold token coins (anyone can send token dust to a public
 *   address); `hasToken` says so, and those coins are listed in `coins`.
 *
 * The UI decides "is there anything to take" from `kind === 'funded'` (or
 * `xecSats > 0n`, which is the same thing); `hasToken` is information only and
 * never blocks taking the XEC home.
 */
export interface PackageState {
    readonly kind: 'empty' | 'funded' | 'taken';
    readonly coins: readonly Coin[];
    /** Sum of the sats of the non-token coins. */
    readonly xecSats: bigint;
    readonly hasToken: boolean;
    /** True when every XEC (non-token) coin is final. Meaningful only for `funded`. */
    readonly allFinal: boolean;
    /** Unix seconds the package was emptied, when known. Only for `taken`. */
    readonly takenAt?: number;
}

/** What a token says about itself. Every word of it is the issuer's own claim: untrusted text. */
export interface TokenMeta {
    readonly name: string;
    readonly ticker: string;
    /** How many of the atoms' last digits are decimals. 0..9. */
    readonly decimals: number;
}

/**
 * What a node says a transaction does to tokens, asked BEFORE it is sent.
 * It is a second opinion on the token part only: no signature is checked.
 */
export interface TokenVerdict {
    /** The node found the token part entirely in order. */
    readonly normal: boolean;
    /** Pushes the node could not read as a token instruction it knows. */
    readonly failedParsings: number;
    readonly entries: readonly {
        readonly tokenId: string;
        readonly send: boolean;
        /** Valid, burns nothing, burns no baton, and every colouring worked. */
        readonly clean: boolean;
    }[];
    /** Per output: the token it would carry, or null. */
    readonly outputs: readonly ({ readonly tokenId: string; readonly atoms: bigint; readonly baton: boolean } | null)[];
}

/** A coin by its outpoint. */
export interface OutPointRef {
    readonly txid: string;
    readonly outIdx: number;
}

/** Options for `Chain.settle`. */
export interface SettleOptions {
    readonly timeoutMs?: number;
    readonly recheckMs?: number;
    /**
     * The coins the transaction spends. With them a lost race is detected even
     * when our tx was dropped before anyone looked: one of them spent by a
     * different txid means `invalid`.
     */
    readonly outpoints?: readonly OutPointRef[];
}

/**
 * `final`: known and final. `seen`: known, not final yet. `absent`: a node
 * answered that it does not know the txid. `unknown`: no answer (offline,
 * error). `absent` alone is weak evidence (another node may have it); the
 * flow only acts on it together with a fresh read showing the coins unspent.
 */
export type TxLookup = 'final' | 'seen' | 'absent' | 'unknown';

/** How a broadcast transaction ended. `unknown` = no verdict before the timeout. */
export type Settlement = 'final' | 'invalid' | 'unknown';

/** The chain, as the app sees it. Implementations: chronik (real) and demo (in-memory, dev only). */
export interface Chain {
    /** Read the package address fresh. Rejects when no node answered. */
    read(address: string): Promise<PackageState>;
    /**
     * The same, but only as several independently run nodes agree it is: what a sweep is signed from. Rejects
     * when they disagree or fewer than two answered. Optional: a chain with one source of truth has no use for it.
     */
    readChecked?(address: string): Promise<PackageState>;
    /** Broadcast a signed transaction. Resolves with its txid; rejects with `ChainError`. */
    broadcast(rawTx: Uint8Array): Promise<string>;
    /**
     * Wait for the verdict on a transaction this page broadcast: listen for the
     * finalized AND the invalidated message, and re-read after `recheckMs` of
     * silence. Never reports `final` from a timeout.
     */
    settle(txid: string, address: string, opts?: SettleOptions): Promise<Settlement>;
    /**
     * What this chain knows about one txid, right now, without waiting.
     * Optional so older fakes still type-check; without it the flow treats
     * every earlier sweep as `unknown` (and so never re-signs over it).
     */
    lookup?(txid: string): Promise<TxLookup>;
    /**
     * The scripts and amounts of one transaction, or null when the chain does
     * not know it. Rejects when no node answered. Optional: without it no
     * wrapper stamp can be read, and a paid wrapper is simply not shown.
     */
    detail?(txid: string): Promise<TxDetail | null>;
    /**
     * The output scripts (lowercase hex) that hold at least one unit of a
     * token right now, mint batons not counted. Rejects when no node answered.
     * Optional: without it no wrapper licence can be read (`core/stamp.ts`).
     */
    holders?(tokenId: string): Promise<readonly string[]>;
    /**
     * Has anything ever been spent FROM this address? True also when the
     * history is too long to read through: the safe answer. Rejects when no
     * node answered. A gift that was opened once can be refilled by anyone,
     * so nothing at it is "from the giver" any more (`core/token.ts`).
     */
    everSpent?(address: string): Promise<boolean>;
    /** A token's own name, ticker and decimals; null when the chain does not know it. Rejects when no node answered. */
    tokenMeta?(tokenId: string): Promise<TokenMeta | null>;
    /** Ask a node what a signed transaction would do to tokens, without sending it. Rejects when no node answered. */
    validate?(rawTx: Uint8Array): Promise<TokenVerdict>;
    /** Call `onChange` whenever something happens at the address. Returns the unsubscribe function. */
    /**
     * The transactions in an address's history, newest first (a bounded number of them). Optional: it is what lets a
     * gift that was already taken home still be shown in the wrapper it was paid for (`ui/screens/package.ts`).
     */
    past?(address: string): Promise<readonly TxDetail[]>;
    watch(address: string, onChange: () => void): () => void;
}

export type ChainErrorCode =
    /** No node could be reached. */
    | 'offline'
    /** The node refused the transaction because the coins are already spent: someone else took it. */
    | 'conflict'
    /** Any other refusal. */
    | 'rejected'
    /** Independently run nodes gave different answers about the package: nothing may be signed from it. */
    | 'disagree';

export class ChainError extends Error {
    readonly code: ChainErrorCode;
    constructor(code: ChainErrorCode, message?: string) {
        super(message ?? code);
        this.name = 'ChainError';
        this.code = code;
    }
}

/** Why a sweep cannot be built. */
export type SweepErrorCode =
    /** No spendable (non-token) coin. */
    | 'nothing'
    /** After the fee, less than the dust limit would arrive: signing would burn the money. */
    | 'dust'
    /** The destination is not a valid `ecash:` address. */
    | 'bad-address'
    /**
     * The token asked for cannot be carried by one transaction (not at the
     * package, a kind this page does not move, or too much for the outputs).
     * `buildSweep` never throws it: it leaves every token coin in place.
     */
    | 'token';

export class SweepError extends Error {
    readonly code: SweepErrorCode;
    constructor(code: SweepErrorCode, message?: string) {
        super(message ?? code);
        this.name = 'SweepError';
        this.code = code;
    }
}

/** A signed sweep of every non-token coin of a package to one destination. */
export interface Sweep {
    readonly raw: Uint8Array;
    readonly txid: string;
    readonly feeSats: bigint;
    /**
     * The XEC that arrives at the destination, beyond the 5.46 XEC each token coin carries. At least the dust
     * limit, except in a `fused` token sweep, where it may be anything from 0 up.
     */
    readonly sentSats: bigint;
    /** The coins this sweep spends, in input order. */
    readonly spent: readonly OutPointRef[];
    /** The token this sweep carries along with the XEC, when it carries one (`buildGiftSweep`). */
    readonly token?: {
        readonly tokenId: string;
        readonly atoms: bigint;
        readonly leftCoins: number;
        /** No XEC output: the little XEC left rides on the last token coin. */
        readonly fused?: true;
    };
    /**
     * Spendable (non-token) coins NOT in this sweep because one sweep is capped
     * at `MAX_SWEEP_INPUTS` inputs. Above 0, offer another round afterwards.
     */
    readonly leftCoins: number;
}

/** What the `EGIF` marker says about a sweep. `null` = no marker. */
export type SweepMarker = 'home' | 'rekey' | null;

/** The two roads into Cashtab for funding a package. */
export interface FundLinks {
    /** `https://cashtab.com/#/send?bip21=…` — works everywhere, carries no `b`. */
    readonly web: string;
    /** `https://pay.e.cash/?bip21=…&b=1` — opens the Cashtab app on Android. */
    readonly app: string;
    /** The bare BIP21 URI, for a QR a wallet can scan. */
    readonly bip21: string;
}

/** The token a sweep carried along. */
export interface TakenToken {
    readonly tokenId: string;
    readonly atoms: bigint;
    /** Coins of this token still at the package: one sweep carries the largest `MAX_TOKEN_INPUTS` only. */
    readonly leftCoins: number;
}

/**
 * The result of the whole "take it home" (or "re-key") operation.
 * `token`: the token that went with the XEC, in the same transaction.
 * `tokenLeft`: a token was asked for but stayed at the package, because
 * the package could not pay to move it.
 */
export type TakeResult =
    /** `leftCoins` (always set by `takeHome`): XEC coins still at the package after this sweep; > 0 means offer another round. */
    | { readonly kind: 'done'; readonly txid: string; readonly sentSats: bigint; readonly leftCoins?: number; readonly token?: TakenToken; readonly tokenLeft?: boolean }
    /** Someone else took the package first. */
    | { readonly kind: 'lost' }
    /** Broadcast, but no verdict yet. The UI must say "not sure yet", never "done". */
    | { readonly kind: 'pending'; readonly txid: string; readonly sentSats: bigint; readonly leftCoins?: number; readonly token?: TakenToken; readonly tokenLeft?: boolean }
    | { readonly kind: 'error'; readonly code: SweepErrorCode | ChainErrorCode; readonly message: string };
