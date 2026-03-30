import {
  __commonJS,
  __require,
  init_esm
} from "./chunk-U2X7QK43.mjs";

// ../../../Users/User/AppData/Local/npm-cache/_npx/e52124a4f8d8670d/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/execAsync.js
var require_execAsync = __commonJS({
  "../../../Users/User/AppData/Local/npm-cache/_npx/e52124a4f8d8670d/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/execAsync.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.execAsync = void 0;
    var child_process = __require("child_process");
    var util = __require("util");
    exports.execAsync = util.promisify(child_process.exec);
  }
});

export {
  require_execAsync
};
//# sourceMappingURL=chunk-ZUQWWW3B.mjs.map
