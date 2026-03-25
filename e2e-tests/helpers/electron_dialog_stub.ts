import type { ElectronApplication } from "playwright";

type DialogMethod = keyof Pick<
  Electron.Dialog,
  | "showCertificateTrustDialog"
  | "showErrorBox"
  | "showMessageBox"
  | "showMessageBoxSync"
  | "showOpenDialog"
  | "showOpenDialogSync"
  | "showSaveDialog"
  | "showSaveDialogSync"
>;

type RetryOptions = {
  timeout?: number;
  pollMs?: number;
};

const dialogDefaults = {
  showCertificateTrustDialog: undefined,
  showErrorBox: undefined,
  showMessageBox: {
    response: 0,
    checkboxChecked: false,
  },
  showMessageBoxSync: 0,
  showOpenDialog: {
    filePaths: [],
    canceled: false,
  },
  showOpenDialogSync: [],
  showSaveDialog: {
    filePath: undefined,
    canceled: false,
  },
  showSaveDialogSync: undefined,
} as const;

const retryableContextErrors = [
  "context or browser has been closed",
  "promise was collected",
  "execution context was destroyed",
  "reading 'getownerbrowserwindow'",
];

function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error);
  return retryableContextErrors.some((pattern) => message.includes(pattern));
}

async function retryElectronEvaluate<T>(
  fn: () => Promise<T>,
  { timeout = 5_000, pollMs = 200 }: RetryOptions = {},
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeout) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error)) {
        throw error;
      }

      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  throw new Error(
    `Timed out while stubbing Electron dialog. Last error: ${String(lastError)}`,
  );
}

function buildStubValue<T extends DialogMethod>(
  method: T,
  value?: Partial<Awaited<ReturnType<Electron.Dialog[T]>>>,
) {
  const defaultValue = dialogDefaults[method];
  if (
    typeof defaultValue === "object" &&
    defaultValue !== null &&
    typeof value === "object" &&
    value !== null
  ) {
    return {
      ...defaultValue,
      ...value,
    };
  }

  return (value ?? defaultValue) as Awaited<ReturnType<Electron.Dialog[T]>>;
}

export async function stubElectronDialog<T extends DialogMethod>(
  app: ElectronApplication,
  method: T,
  value?: Partial<Awaited<ReturnType<Electron.Dialog[T]>>>,
): Promise<void> {
  const stubValue = buildStubValue(method, value);

  await retryElectronEvaluate(() =>
    app.evaluate(
      ({ dialog }, { dialogMethod, dialogValue }) => {
        const patchedDialog = dialog as unknown as Record<string, unknown>;
        const targetMethod = patchedDialog[dialogMethod];
        if (!targetMethod) {
          throw new Error(`Dialog method "${dialogMethod}" is unavailable.`);
        }

        if (dialogMethod.endsWith("Sync")) {
          patchedDialog[dialogMethod] = () => dialogValue;
          return;
        }

        patchedDialog[dialogMethod] = async () => dialogValue;
      },
      {
        dialogMethod: method,
        dialogValue: stubValue,
      },
    ),
  );
}
