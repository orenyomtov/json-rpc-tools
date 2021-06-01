import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import HttpConnection from "@json-rpc-tools/http-connection";
import WsConnection from "@json-rpc-tools/ws-connection";

import JsonRpcProvider from "../src";

chai.use(chaiAsPromised);

const TEST_RANDOM_HOST = "random.domain.that.does.not.exist";

const TEST_ETH_REQUEST = {
  method: "eth_chainId",
  params: [],
};
const TEST_ETH_RESULT = "0x2a";

const TEST_RANDOM_REQUEST = { method: "test_method", params: [] };

const TEST_WAKU_REQUEST = {
  method: "waku_subscribe",
  params: {
    topic: "ca838d59a3a3fe3824dab9ca7882ac9a2227c5d0284c88655b261a2fe85db270",
  },
};

const TEST_URL = {
  http: {
    good: `https://kovan.poa.network`,
    bad: `http://${TEST_RANDOM_HOST}`,
  },
  ws: {
    good: `wss://staging.walletconnect.org`,
    bad: `ws://${TEST_RANDOM_HOST}`,
  },
};

describe("@json-rpc-tools/provider", () => {
  describe("HTTP", () => {
    it("Succesfully connects and requests", async () => {
      const connection = new HttpConnection(TEST_URL.http.good);
      const provider = new JsonRpcProvider(connection);
      await provider.connect();
      const result = await provider.request(TEST_ETH_REQUEST);
      chai.expect(!!result).to.be.true;
      chai.expect(result).to.eql(TEST_ETH_RESULT);
    });
    it("Successfully requests without calling connect", async () => {
      const connection = new HttpConnection(TEST_URL.http.good);
      const provider = new JsonRpcProvider(connection);
      const result = await provider.request(TEST_ETH_REQUEST);
      chai.expect(!!result).to.be.true;
      chai.expect(result).to.eql(TEST_ETH_RESULT);
    });
    it("Throws error when receives json-rpc error", async () => {
      const connection = new HttpConnection(TEST_URL.http.good);
      const provider = new JsonRpcProvider(connection);
      const promise = provider.request(TEST_RANDOM_REQUEST);
      await chai.expect(promise).to.eventually.be.rejectedWith(`Method not found`);
    });
    it("Throws when connecting to unavailable host", async () => {
      const connection = new HttpConnection(TEST_URL.http.bad);
      const provider = new JsonRpcProvider(connection);
      const promise = provider.request(TEST_RANDOM_REQUEST);
      await chai
        .expect(promise)
        .to.eventually.be.rejectedWith(`Unavailable HTTP RPC url at ${TEST_URL.http.bad}`);
    });
  });
  describe("WS", () => {
    it("Succesfully connects and requests", async () => {
      const connection = new WsConnection(TEST_URL.ws.good);
      const provider = new JsonRpcProvider(connection);
      await provider.connect();
      const result = await provider.request(TEST_WAKU_REQUEST);
      chai.expect(!!result).to.be.true;
    });
    it("Successfully requests without calling connect", async () => {
      const connection = new WsConnection(TEST_URL.ws.good);
      const provider = new JsonRpcProvider(connection);
      const result = await provider.request(TEST_WAKU_REQUEST);
      chai.expect(!!result).to.be.true;
    });
    it("Throws error when receives json-rpc error", async () => {
      const connection = new WsConnection(TEST_URL.ws.good);
      const provider = new JsonRpcProvider(connection);
      const promise = provider.request({ ...TEST_WAKU_REQUEST, params: {} });
      await chai
        .expect(promise)
        .to.eventually.be.rejectedWith("JSON-RPC Request has invalid subscribe params");
    });
    // it("Throws when connecting to unavailable host", async () => {
    //   const connection = new WsConnection(TEST_URL.ws.bad);
    //   const provider = new JsonRpcProvider(connection);
    //   await provider.connect();
    //   // const promise = provider.request(TEST_RANDOM_REQUEST);
    //   // await chai
    //   //   .expect(promise)
    //   //   .to.eventually.be.rejectedWith(`Unavailable HTTP RPC url at ${TEST_URL.http.bad}`);
    // });
  });
});
