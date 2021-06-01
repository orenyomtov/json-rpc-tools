import { EventEmitter } from "events";
import fetch from "cross-fetch";
import { safeJsonParse, safeJsonStringify } from "safe-json-utils";
import {
  formatJsonRpcError,
  IJsonRpcConnection,
  JsonRpcPayload,
  isHttpUrl,
} from "@json-rpc-tools/utils";

const DEFAULT_HTTP_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const DEFAULT_HTTP_METHOD = "POST";

const DEFAULT_FETCH_OPTS = {
  headers: DEFAULT_HTTP_HEADERS,
  method: DEFAULT_HTTP_METHOD,
};

export class HttpConnection implements IJsonRpcConnection {
  public events = new EventEmitter();

  private isAvailable = false;

  private registering = false;

  constructor(public url: string) {
    if (!isHttpUrl(url)) {
      throw new Error(`Provided URL is not compatible with HTTP connection: ${url}`);
    }
    this.url = url;
  }

  get connected(): boolean {
    return this.isAvailable;
  }

  get connecting(): boolean {
    return this.registering;
  }

  public on(event: string, listener: any): void {
    this.events.on(event, listener);
  }

  public once(event: string, listener: any): void {
    this.events.once(event, listener);
  }

  public off(event: string, listener: any): void {
    this.events.off(event, listener);
  }

  public removeListener(event: string, listener: any): void {
    this.events.removeListener(event, listener);
  }

  public async open(url: string = this.url): Promise<void> {
    await this.register(url);
  }

  public async close(): Promise<void> {
    this.onClose();
  }

  public async send(payload: JsonRpcPayload, context?: any): Promise<void> {
    const body = safeJsonStringify(payload);
    fetch(this.url, { ...DEFAULT_FETCH_OPTS, body })
      .then(res => res.json())
      .then(data => this.onPayload({ data }))
      .catch(err => this.onError(payload.id, err));
  }

  // ---------- Private ----------------------------------------------- //

  private async register(url = this.url): Promise<void> {
    if (!isHttpUrl(url)) {
      throw new Error(`Provided URL is not compatible with HTTP connection: ${url}`);
    }
    if (this.registering) {
      return new Promise((resolve, reject) => {
        this.events.once("error", error => {
          reject(error);
        });
        this.events.once("open", () => {
          if (typeof this.isAvailable === "undefined") {
            return reject(new Error("HTTP connection is missing or invalid"));
          }
          resolve();
        });
      });
    }
    this.url = url;
    this.registering = true;
    try {
      const body = safeJsonStringify({ id: 1, jsonrpc: "2.0", method: "test", params: [] });
      await fetch(url, { ...DEFAULT_FETCH_OPTS, body });
      this.onOpen();
    } catch (e) {
      const error = e.message.includes("getaddrinfo ENOTFOUND")
        ? new Error(`Unavailable HTTP RPC url at ${this.url}`)
        : e;
      this.events.emit("error", error);
      this.onClose();
      throw error;
    }
  }

  private onOpen() {
    this.isAvailable = true;
    this.registering = false;
    this.events.emit("open");
  }

  private onClose() {
    this.isAvailable = false;
    this.registering = false;
    this.events.emit("close");
  }

  private onPayload(e: { data: any }) {
    if (typeof e.data === "undefined") return;
    const payload: JsonRpcPayload = typeof e.data === "string" ? safeJsonParse(e.data) : e.data;
    this.events.emit("payload", payload);
  }

  private onError(id: number, error: Error) {
    const message = error.message || error.toString();
    const payload = formatJsonRpcError(id, message);
    this.events.emit("error", error);
    this.events.emit("payload", payload);
  }
}

export default HttpConnection;
