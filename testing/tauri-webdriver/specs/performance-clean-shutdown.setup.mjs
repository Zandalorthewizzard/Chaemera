import {
  createBaseUserSettings,
  writeUserSettingsToDir,
} from "../runtime_profile.mjs";

export default async function setupRuntime({ tauriAppDataDir }) {
  writeUserSettingsToDir(
    tauriAppDataDir,
    createBaseUserSettings({
      isRunning: false,
      lastKnownPerformance: {
        timestamp: Date.now() - 5_000,
        memoryUsageMB: 256,
        cpuUsagePercent: 45.5,
        systemMemoryUsageMB: 8192,
        systemMemoryTotalMB: 16384,
        systemCpuPercent: 35.2,
      },
    }),
  );
}
