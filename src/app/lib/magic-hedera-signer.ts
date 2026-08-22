/**
 * Magic Hedera Signer — Signer + Provider for @hashgraph/sdk
 * ==========================================================
 * Ported from Magic’s official example-hedera (MagicWallet / MagicProvider).
 * The private key never enters this module — signing always goes through
 * `magic.hedera.sign` inside Magic’s TEE.
 *
 * @see https://github.com/magiclabs/example-hedera
 * @see https://docs.magic.link/embedded-wallets/blockchains/evm/hedera
 */

import {
  AccountId,
  AccountBalanceQuery,
  AccountInfoQuery,
  AccountRecordsQuery,
  Client,
  PublicKey,
  SignerSignature,
  TransactionId,
  TransactionReceiptQuery,
  type Executable,
  type Provider,
  type Signer,
  type Transaction,
} from "@hashgraph/sdk";
import { shuffle } from "@magic-ext/hedera";
import { getMagic } from "./magic-client";
import { getMagicHederaNetwork } from "./wallet-types";

/** Normalize Magic `hedera.sign` output to raw signature bytes for the SDK Signer. */
export async function magicSignToBytes(
  message: string | Uint8Array
): Promise<Uint8Array> {
  const magic = getMagic();
  if (!magic) throw new Error("Magic is not available");

  const result = await magic.hedera.sign(message as Uint8Array);
  if (!result) throw new Error("Magic returned an empty signature");

  if (result instanceof Uint8Array) return result;
  if (ArrayBuffer.isView(result)) {
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  }
  if (typeof result === "string") {
    const cleaned = result.startsWith("0x") ? result.slice(2) : result;
    // Hex
    if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0) {
      const out = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
      }
      return out;
    }
    // Base64
    try {
      const bin = atob(cleaned);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch {
      throw new Error("Magic signature string was neither hex nor base64");
    }
  }
  if (result?.signature instanceof Uint8Array) return result.signature;
  if (typeof result?.signature === "string") {
    return magicSignToBytes(result.signature);
  }

  throw new Error("Unrecognized Magic signature format");
}

export class MagicProvider implements Provider {
  private readonly _client: Client;

  constructor(hederaNetwork: string) {
    if (!hederaNetwork) {
      throw new Error("MagicProvider requires a Hedera network name");
    }
    this._client = Client.forName(hederaNetwork);
  }

  getLedgerId() {
    return this._client.ledgerId;
  }

  getNetwork() {
    return this._client.network;
  }

  getMirrorNetwork() {
    return this._client.mirrorNetwork;
  }

  getAccountBalance(accountId: AccountId | string) {
    return new AccountBalanceQuery().setAccountId(accountId).execute(this._client);
  }

  getAccountInfo(accountId: AccountId | string) {
    return new AccountInfoQuery().setAccountId(accountId).execute(this._client);
  }

  getAccountRecords(accountId: AccountId | string) {
    return new AccountRecordsQuery().setAccountId(accountId).execute(this._client);
  }

  getTransactionReceipt(transactionId: TransactionId | string) {
    return new TransactionReceiptQuery()
      .setTransactionId(transactionId)
      .execute(this._client);
  }

  waitForReceipt(response: { nodeId: AccountId; transactionId: TransactionId }) {
    return new TransactionReceiptQuery()
      .setNodeAccountIds([response.nodeId])
      .setTransactionId(response.transactionId)
      .execute(this._client);
  }

  call<RequestT, ResponseT, OutputT>(
    request: Executable<RequestT, ResponseT, OutputT>
  ): Promise<OutputT> {
    return request.execute(this._client);
  }
}

/**
 * Hedera SDK Signer backed by Magic. Never holds a private key.
 */
export class MagicWallet implements Signer {
  readonly publicKey: PublicKey;
  readonly provider: MagicProvider;
  readonly accountId: AccountId;
  private readonly signerFn: (message: Uint8Array) => Promise<Uint8Array>;

  constructor(
    accountId: AccountId | string,
    provider: MagicProvider,
    publicKeyDer: string,
    magicSign: (message: Uint8Array) => Promise<Uint8Array>
  ) {
    this.publicKey = PublicKey.fromString(publicKeyDer);
    this.signerFn = magicSign;
    this.provider = provider;
    this.accountId =
      typeof accountId === "string" ? AccountId.fromString(accountId) : accountId;
  }

  getProvider() {
    return this.provider;
  }

  getAccountId() {
    return this.accountId;
  }

  getAccountKey() {
    return this.publicKey;
  }

  getLedgerId() {
    return this.provider.getLedgerId();
  }

  getNetwork() {
    return this.provider.getNetwork();
  }

  getMirrorNetwork() {
    return this.provider.getMirrorNetwork();
  }

  async sign(messages: Uint8Array[]): Promise<SignerSignature[]> {
    const signatures: SignerSignature[] = [];
    for (const message of messages) {
      signatures.push(
        new SignerSignature({
          publicKey: this.publicKey,
          signature: await this.signerFn(message),
          accountId: this.accountId,
        })
      );
    }
    return signatures;
  }

  getAccountBalance() {
    return this.call(new AccountBalanceQuery().setAccountId(this.accountId));
  }

  getAccountInfo() {
    return this.call(new AccountInfoQuery().setAccountId(this.accountId));
  }

  getAccountRecords() {
    return this.call(new AccountRecordsQuery().setAccountId(this.accountId));
  }

  signTransaction<T extends Transaction>(transaction: T): Promise<T> {
    return transaction.signWith(this.publicKey, this.signerFn);
  }

  checkTransaction<T extends Transaction>(transaction: T): Promise<T> {
    const transactionId = transaction.transactionId;
    if (
      transactionId?.accountId != null &&
      transactionId.accountId.compare(this.accountId) !== 0
    ) {
      throw new Error("transaction's ID constructed with a different account ID");
    }

    const nodeAccountIds = (
      transaction.nodeAccountIds != null ? transaction.nodeAccountIds : []
    ).map((nodeAccountId) => nodeAccountId.toString());
    const network = Object.values(this.provider.getNetwork()).map((nodeAccountId) =>
      nodeAccountId.toString()
    );

    if (!nodeAccountIds.reduce((prev, cur) => prev && network.includes(cur), true)) {
      throw new Error(
        "Transaction already set node account IDs to values not within the current network"
      );
    }

    return Promise.resolve(transaction);
  }

  populateTransaction<T extends Transaction>(transaction: T): Promise<T> {
    // SDK internal helper used by Magic’s official Signer example
    (transaction as T & { _freezeWithAccountId: (id: AccountId) => void })._freezeWithAccountId(
      this.accountId
    );

    if (transaction.transactionId == null) {
      transaction.setTransactionId(TransactionId.generate(this.accountId));
    }

    if (transaction.nodeAccountIds != null && transaction.nodeAccountIds.length !== 0) {
      return Promise.resolve(transaction.freeze());
    }

    const nodeAccountIds = Object.values(this.provider.getNetwork()).map((id) =>
      typeof id === "string" ? AccountId.fromString(id) : id
    );
    shuffle(nodeAccountIds as AccountId[]);
    transaction.setNodeAccountIds(
      nodeAccountIds.slice(0, Math.floor((nodeAccountIds.length + 3 - 1) / 3)) as AccountId[]
    );

    return Promise.resolve(transaction.freeze());
  }

  call<RequestT, ResponseT, OutputT>(
    request: Executable<RequestT, ResponseT, OutputT>
  ): Promise<OutputT> {
    const withOp = (
      request as Executable<RequestT, ResponseT, OutputT> & {
        _setOperatorWith: (
          accountId: AccountId,
          publicKey: PublicKey,
          signer: (message: Uint8Array) => Promise<Uint8Array>
        ) => Executable<RequestT, ResponseT, OutputT>;
      }
    )._setOperatorWith(this.accountId, this.publicKey, this.signerFn);
    return this.provider.call(withOp);
  }
}

/** Build a MagicWallet for the connected Magic Hedera account. */
export async function createMagicWallet(accountId: string): Promise<MagicWallet | null> {
  const magic = getMagic();
  if (!magic) return null;

  try {
    const loggedIn = await magic.user.isLoggedIn();
    if (!loggedIn) return null;

    const { publicKeyDer } = await magic.hedera.getPublicKey();
    if (!publicKeyDer) return null;

    const network = getMagicHederaNetwork();
    const provider = new MagicProvider(network);
    return new MagicWallet(accountId, provider, publicKeyDer, magicSignToBytes);
  } catch (err) {
    console.warn("[MagicSigner] Failed to create MagicWallet");
    return null;
  }
}
