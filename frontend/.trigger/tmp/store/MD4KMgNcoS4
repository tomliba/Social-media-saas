import {
  defineConfig
} from "../../../chunk-BHRND6QY.mjs";
import "../../../chunk-WBDURXJA.mjs";
import {
  init_esm
} from "../../../chunk-U2X7QK43.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF,
  dirs: ["./trigger"],
  // 5 min max per task (video renders ~106s)
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2
    }
  },
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
