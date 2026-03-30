import {
  __name,
  init_esm
} from "./chunk-U2X7QK43.mjs";

// ../../../Users/User/AppData/Local/npm-cache/_npx/e52124a4f8d8670d/node_modules/uncrypto/dist/crypto.node.mjs
init_esm();
import nodeCrypto from "node:crypto";
var subtle = nodeCrypto.webcrypto?.subtle || {};
var randomUUID = /* @__PURE__ */ __name(() => {
  return nodeCrypto.randomUUID();
}, "randomUUID");
var getRandomValues = /* @__PURE__ */ __name((array) => {
  return nodeCrypto.webcrypto.getRandomValues(array);
}, "getRandomValues");
var _crypto = {
  randomUUID,
  getRandomValues,
  subtle
};
export {
  _crypto as default,
  getRandomValues,
  randomUUID,
  subtle
};
//# sourceMappingURL=crypto.node-TXEGISGQ.mjs.map
