import { z } from "zod";
import { isOpenAIOrAnthropicSetup } from "./providerUtils";

export const SecretSchema = z.object({
  value: z.string(),
  encryptionType: z.enum(["electron-safe-storage", "plaintext"]).optional(),
});
export type Secret = z.infer<typeof SecretSchema>;

/**
 * Zod schema for chat summary objects returned by the get-chats IPC
 */
export const ChatSummarySchema = z.object({
  id: z.number(),
  appId: z.number(),
  title: z.string().nullable(),
  createdAt: z.date(),
});

/**
 * Type derived from the ChatSummarySchema
 */
export type ChatSummary = z.infer<typeof ChatSummarySchema>;

/**
 * Zod schema for an array of chat summaries
 */
export const ChatSummariesSchema = z.array(ChatSummarySchema);

/**
 * Zod schema for chat search result objects returned by the search-chats IPC
 */
export const ChatSearchResultSchema = z.object({
  id: z.number(),
  appId: z.number(),
  title: z.string().nullable(),
  createdAt: z.date(),
  matchedMessageContent: z.string().nullable(),
});

/**
 * Type derived from the ChatSearchResultSchema
 */
export type ChatSearchResult = z.infer<typeof ChatSearchResultSchema>;

export const ChatSearchResultsSchema = z.array(ChatSearchResultSchema);

// Zod schema for app search result objects returned by the search-app IPC
export const AppSearchResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
  matchedChatTitle: z.string().nullable(),
  matchedChatMessage: z.string().nullable(),
});

// Type derived from AppSearchResultSchema
export type AppSearchResult = z.infer<typeof AppSearchResultSchema>;

export const AppSearchResultsSchema = z.array(AppSearchResultSchema);

const providers = [
  "openai",
  "anthropic",
  "google",
  "vertex",
  "auto",
  "openrouter",
  "ollama",
  "lmstudio",
  "azure",
  "xai",
  "bedrock",
] as const;

export const cloudProviders = providers.filter(
  (provider) => provider !== "ollama" && provider !== "lmstudio",
);

/**
 * Zod schema for large language model configuration
 */
export const LargeLanguageModelSchema = z.object({
  name: z.string(),
  provider: z.string(),
  customModelId: z.number().optional(),
});

/**
 * Type derived from the LargeLanguageModelSchema
 */
export type LargeLanguageModel = z.infer<typeof LargeLanguageModelSchema>;

/**
 * Zod schema for provider settings
 * Regular providers use only apiKey. Vertex has additional optional fields.
 */
export const RegularProviderSettingSchema = z.object({
  apiKey: SecretSchema.optional(),
});

export const AzureProviderSettingSchema = z.object({
  apiKey: SecretSchema.optional(),
  resourceName: z.string().optional(),
});

export const VertexProviderSettingSchema = z.object({
  // We make this undefined so that it makes existing callsites easier.
  apiKey: z.undefined(),
  projectId: z.string().optional(),
  location: z.string().optional(),
  serviceAccountKey: SecretSchema.optional(),
});

export const ProviderSettingSchema = z.union([
  // Must use more specific type first!
  // Zod uses the first type that matches.
  //
  // We use passthrough as a hack because Azure and Vertex
  // will match together since their required fields overlap.
  //
  // In addition, there may be future provider settings that
  // we may want to preserve (e.g. user downgrades to older version)
  // so doing passthrough keeps these extra fields.
  AzureProviderSettingSchema.passthrough(),
  VertexProviderSettingSchema.passthrough(),
  RegularProviderSettingSchema.passthrough(),
]);

/**
 * Type derived from the ProviderSettingSchema
 */
export type ProviderSetting = z.infer<typeof ProviderSettingSchema>;
export type RegularProviderSetting = z.infer<
  typeof RegularProviderSettingSchema
>;
export type AzureProviderSetting = z.infer<typeof AzureProviderSettingSchema>;
export type VertexProviderSetting = z.infer<typeof VertexProviderSettingSchema>;

export const RuntimeModeSchema = z.enum(["web-sandbox", "local-node", "unset"]);
export type RuntimeMode = z.infer<typeof RuntimeModeSchema>;

export const RuntimeMode2Schema = z.enum(["host", "docker"]);
export type RuntimeMode2 = z.infer<typeof RuntimeMode2Schema>;

/**
 * Chat modes that can be stored in settings (includes deprecated values for backwards compat)
 */
export const StoredChatModeSchema = z.enum([
  "build",
  "ask",
  "agent", // DEPRECATED: converted to "build" on read
  "local-agent",
  "plan",
]);
export type StoredChatMode = z.infer<typeof StoredChatModeSchema>;

/**
 * Active chat modes (excludes deprecated values)
 */
export const ChatModeSchema = z.enum(["build", "ask", "local-agent", "plan"]);
export type ChatMode = z.infer<typeof ChatModeSchema>;

export const GitHubSecretsSchema = z.object({
  accessToken: SecretSchema.nullable(),
});
export type GitHubSecrets = z.infer<typeof GitHubSecretsSchema>;

export const GithubUserSchema = z.object({
  email: z.string(),
});
export type GithubUser = z.infer<typeof GithubUserSchema>;

/**
 * Supabase organization credentials.
 * Each organization has its own OAuth tokens.
 */
export const SupabaseOrganizationCredentialsSchema = z.object({
  accessToken: SecretSchema,
  refreshToken: SecretSchema,
  expiresIn: z.number(),
  tokenTimestamp: z.number(),
});
export type SupabaseOrganizationCredentials = z.infer<
  typeof SupabaseOrganizationCredentialsSchema
>;

export const SupabaseSchema = z.object({
  // Map keyed by organizationSlug -> organization credentials
  organizations: z
    .record(z.string(), SupabaseOrganizationCredentialsSchema)
    .optional(),

  // Legacy fields - kept for backwards compat
  accessToken: SecretSchema.optional(),
  refreshToken: SecretSchema.optional(),
  expiresIn: z.number().optional(),
  tokenTimestamp: z.number().optional(),
});
export type Supabase = z.infer<typeof SupabaseSchema>;

export const NeonSchema = z.object({
  accessToken: SecretSchema.optional(),
  refreshToken: SecretSchema.optional(),
  expiresIn: z.number().optional(),
  tokenTimestamp: z.number().optional(),
});
export type Neon = z.infer<typeof NeonSchema>;

export const ExperimentsSchema = z.object({
  // Deprecated
  enableLocalAgent: z.boolean().describe("DEPRECATED").optional(),
  enableSupabaseIntegration: z.boolean().describe("DEPRECATED").optional(),
  enableFileEditing: z.boolean().describe("DEPRECATED").optional(),
});
export type Experiments = z.infer<typeof ExperimentsSchema>;

export const CloudAIBudgetSchema = z.object({
  budgetResetAt: z.string(),
  maxBudget: z.number(),
});
export type CloudAIBudget = z.infer<typeof CloudAIBudgetSchema>;

export const GlobPathSchema = z.object({
  globPath: z.string(),
});

export type GlobPath = z.infer<typeof GlobPathSchema>;

export const AppChatContextSchema = z.object({
  contextPaths: z.array(GlobPathSchema),
  smartContextAutoIncludes: z.array(GlobPathSchema),
  excludePaths: z.array(GlobPathSchema).optional(),
});
export type AppChatContext = z.infer<typeof AppChatContextSchema>;

export type ContextPathResult = GlobPath & {
  files: number;
  tokens: number;
};

export type ContextPathResults = {
  contextPaths: ContextPathResult[];
  smartContextAutoIncludes: ContextPathResult[];
  excludePaths: ContextPathResult[];
};

export const ReleaseChannelSchema = z.enum(["stable", "beta"]);
export type ReleaseChannel = z.infer<typeof ReleaseChannelSchema>;

export const ZoomLevelSchema = z.enum(["90", "100", "110", "125", "150"]);
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;
export const ZOOM_LEVELS: readonly ZoomLevel[] = ZoomLevelSchema.options;
export const DEFAULT_ZOOM_LEVEL: ZoomLevel = "100";

export const LanguageSchema = z.enum([
  "en",
  "zh-CN",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "pt-BR",
]);
export type Language = z.infer<typeof LanguageSchema>;

export const DeviceModeSchema = z.enum(["desktop", "tablet", "mobile"]);
export type DeviceMode = z.infer<typeof DeviceModeSchema>;

export const SmartContextModeSchema = z.enum([
  "balanced",
  "conservative",
  "deep",
]);
export type SmartContextMode = z.infer<typeof SmartContextModeSchema>;

export const AgentToolConsentSchema = z.enum(["ask", "always", "never"]);
export type AgentToolConsent = z.infer<typeof AgentToolConsentSchema>;

/**
 * Base fields shared between StoredUserSettings and UserSettings
 */
const BaseUserSettingsFields = {
  ////////////////////////////////
  // E2E TESTING ONLY.
  ////////////////////////////////
  isTestMode: z.boolean().optional(),

  ////////////////////////////////
  // DEPRECATED.
  ////////////////////////////////
  enableProSaverMode: z.boolean().optional(),
  cloudAIBudget: CloudAIBudgetSchema.optional(),
  runtimeMode: RuntimeModeSchema.optional(),

  ////////////////////////////////
  // ACTIVE FIELDS.
  ////////////////////////////////
  selectedModel: LargeLanguageModelSchema,
  providerSettings: z.record(z.string(), ProviderSettingSchema),
  agentToolConsents: z.record(z.string(), AgentToolConsentSchema).optional(),
  githubUser: GithubUserSchema.optional(),
  githubAccessToken: SecretSchema.optional(),
  vercelAccessToken: SecretSchema.optional(),
  supabase: SupabaseSchema.optional(),
  neon: NeonSchema.optional(),
  autoApproveChanges: z.boolean().optional(),
  telemetryConsent: z.enum(["opted_in", "opted_out", "unset"]).optional(),
  telemetryUserId: z.string().optional(),
  hasRunBefore: z.boolean().optional(),
  enableCloudAI: z.boolean().optional(),
  experiments: ExperimentsSchema.optional(),
  lastShownReleaseNotesVersion: z.string().optional(),
  maxChatTurnsInContext: z.number().optional(),
  thinkingBudget: z.enum(["low", "medium", "high"]).optional(),
  enableTurboEditsV2: z.boolean().optional(),
  turboEditsMode: z.enum(["off", "v1", "v2"]).optional(),
  enableSmartFilesContextMode: z.boolean().optional(),
  enableWebSearch: z.boolean().optional(),
  smartContextOption: SmartContextModeSchema.optional(),
  selectedTemplateId: z.string(),
  selectedThemeId: z.string().optional(),
  enableSupabaseWriteSqlMigration: z.boolean().optional(),
  skipPruneEdgeFunctions: z.boolean().optional(),
  acceptedCommunityCode: z.boolean().optional(),
  zoomLevel: ZoomLevelSchema.optional(),
  language: LanguageSchema.optional(),
  previewDeviceMode: DeviceModeSchema.optional(),

  enableAutoFixProblems: z.boolean().optional(),
  autoExpandPreviewPanel: z.boolean().optional(),
  enableChatCompletionNotifications: z.boolean().optional(),
  enableNativeGit: z.boolean().optional(),
  enableMcpServersForBuildMode: z.boolean().optional(),
  enableAutoUpdate: z.boolean(),
  releaseChannel: ReleaseChannelSchema,
  runtimeMode2: RuntimeMode2Schema.optional(),
  customNodePath: z.string().optional().nullable(),
  isRunning: z.boolean().optional(),
  lastKnownPerformance: z
    .object({
      timestamp: z.number(),
      memoryUsageMB: z.number(),
      cpuUsagePercent: z.number().optional(),
      systemMemoryUsageMB: z.number().optional(),
      systemMemoryTotalMB: z.number().optional(),
      systemCpuPercent: z.number().optional(),
    })
    .optional(),
  hideLocalAgentNewChatToast: z.boolean().optional(),
  enableContextCompaction: z.boolean().optional(),
};

/**
 * Zod schema for stored user settings (includes deprecated values for backwards compat).
 * This is what gets written to/read from the JSON file.
 */
export const StoredUserSettingsSchema = z
  .object({
    ...BaseUserSettingsFields,
    // Use StoredChatModeSchema to allow deprecated "agent" value
    selectedChatMode: StoredChatModeSchema.optional(),
    defaultChatMode: StoredChatModeSchema.optional(),
  })
  // Allow unknown properties to pass through (e.g. future settings
  // that should be preserved if user downgrades to an older version)
  .passthrough();

/**
 * Type derived from the StoredUserSettingsSchema
 */
export type StoredUserSettings = z.infer<typeof StoredUserSettingsSchema>;

/**
 * Zod schema for active user settings (excludes deprecated values).
 * This is what the application uses at runtime.
 */
export const UserSettingsSchema = z
  .object({
    ...BaseUserSettingsFields,
    // Use ChatModeSchema which excludes deprecated "agent" value
    selectedChatMode: ChatModeSchema.optional(),
    defaultChatMode: ChatModeSchema.optional(),
  })
  // Allow unknown properties to pass through (e.g. future settings
  // that should be preserved if user downgrades to an older version)
  .passthrough();

/**
 * Type derived from the UserSettingsSchema
 */
export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Migrates a stored chat mode to an active chat mode.
 * Converts deprecated "agent" mode to "build".
 */
export function migrateStoredChatMode(
  mode: StoredChatMode | undefined,
): ChatMode | undefined {
  if (mode === "agent") {
    return "build";
  }
  return mode;
}

/**
 * Migrates stored settings to active settings.
 * Applies necessary transformations for deprecated values.
 */
export function migrateStoredSettings(
  stored: StoredUserSettings,
): UserSettings {
  const {
    enableDyadPro: _enableDyadPro,
    dyadProBudget: _dyadProBudget,
    enableProLazyEditsMode: _enableProLazyEditsMode,
    proLazyEditsMode: _proLazyEditsMode,
    ...restStored
  } = stored;
  const legacyStored = stored as Record<string, unknown>;
  const enableCloudAI =
    restStored.enableCloudAI ??
    (typeof stored.enableDyadPro === "boolean"
      ? stored.enableDyadPro
      : undefined);
  const enableSmartFilesContextMode =
    restStored.enableSmartFilesContextMode ??
    (typeof legacyStored.enableProSmartFilesContextMode === "boolean"
      ? legacyStored.enableProSmartFilesContextMode
      : undefined);
  const enableWebSearch =
    restStored.enableWebSearch ??
    (typeof legacyStored.enableProWebSearch === "boolean"
      ? legacyStored.enableProWebSearch
      : undefined);
  const enableTurboEditsV2 =
    restStored.enableTurboEditsV2 ??
    (typeof legacyStored.enableProLazyEditsMode === "boolean"
      ? legacyStored.enableProLazyEditsMode
      : undefined);
  const turboEditsMode =
    restStored.turboEditsMode ??
    (typeof legacyStored.proLazyEditsMode === "string"
      ? (legacyStored.proLazyEditsMode as "off" | "v1" | "v2" | undefined)
      : undefined);
  const smartContextOption =
    restStored.smartContextOption ??
    (typeof legacyStored.proSmartContextOption === "string"
      ? (legacyStored.proSmartContextOption as SmartContextMode | undefined)
      : undefined);
  return {
    ...restStored,
    enableCloudAI,
    enableSmartFilesContextMode,
    enableWebSearch,
    enableTurboEditsV2,
    turboEditsMode,
    smartContextOption,
    selectedChatMode: migrateStoredChatMode(stored.selectedChatMode),
    defaultChatMode: migrateStoredChatMode(stored.defaultChatMode),
  };
}

export function isCloudAIEnabled(settings: UserSettings): boolean {
  return settings.enableCloudAI === true && hasCloudAIKey(settings);
}

export function hasCloudAIKey(settings: UserSettings): boolean {
  return !!settings.providerSettings?.auto?.apiKey?.value;
}

/**
 * Hosted agent access is intentionally disabled in the current Chaemera
 * release line. The underlying entitlement layer stays in place for a future
 * optional subscription model.
 */
export function hasHostedAgentAccess(_settings: UserSettings): boolean {
  return false;
}

/**
 * Gets the effective default chat mode based on settings, cloud access, and free quota availability.
 * - If defaultChatMode is set and valid for the user's cloud access status, use it
 * - If defaultChatMode is "local-agent" but user does not have cloud access:
 *   - If free agent quota available AND OpenAI/Anthropic is set up, use "local-agent" (basic agent mode)
 *   - Otherwise, fall back to "build"
 * - If defaultChatMode is NOT set:
 *   - Cloud users: use "local-agent"
 *   - Non-cloud users with quota AND OpenAI/Anthropic set up: use "local-agent" (basic agent mode)
 *   - Non-cloud users without quota or provider: use "build"
 */
export function getEffectiveDefaultChatMode(
  settings: UserSettings,
  envVars: Record<string, string | undefined>,
): ChatMode {
  // We are checking that OpenAI or Anthropic is setup, which are the first two
  // choices for the Auto model selection.
  //
  // If user only has Gemini API key, we don't default to local-agent because
  // most likely it's a free API key with stringent limits and they'll get
  // a bad experience with local-agent.
  const hasPaidProviderSetup = isOpenAIOrAnthropicSetup(settings, envVars);

  if (settings.defaultChatMode) {
    // "local-agent" requires a configured provider.
    if (settings.defaultChatMode === "local-agent") {
      return hasPaidProviderSetup ? "local-agent" : "build";
    }
    return settings.defaultChatMode;
  }

  return "build";
}

/**
 * Determines if the current session is using Basic Agent mode (hosted access gated by quota).
 * Basic Agent mode is when:
 * - User does NOT have hosted access
 * - User is using local-agent chat mode
 */
export function isBasicAgentMode(settings: UserSettings): boolean {
  return (
    hasHostedAgentAccess(settings) &&
    settings.selectedChatMode === "local-agent"
  );
}

export function isSupabaseConnected(settings: UserSettings | null): boolean {
  if (!settings) {
    return false;
  }
  return Boolean(
    settings.supabase?.accessToken ||
    (settings.supabase?.organizations &&
      Object.keys(settings.supabase.organizations).length > 0),
  );
}

export function isTurboEditsV2Enabled(settings: UserSettings): boolean {
  return Boolean(
    settings.enableTurboEditsV2 === true && settings.turboEditsMode === "v2",
  );
}

// Define interfaces for the props
export interface SecurityRisk {
  type: "warning" | "danger";
  title: string;
  description: string;
}

export interface FileChange {
  name: string;
  path: string;
  summary: string;
  type: "write" | "rename" | "delete";
  isServerFunction: boolean;
}

export interface CodeProposal {
  type: "code-proposal";
  title: string;
  securityRisks: SecurityRisk[];
  filesChanged: FileChange[];
  packagesAdded: string[];
  sqlQueries: SqlQuery[];
}

export type SuggestedAction =
  | RestartAppAction
  | SummarizeInNewChatAction
  | RefactorFileAction
  | WriteCodeProperlyAction
  | RebuildAction
  | RestartAction
  | RefreshAction
  | KeepGoingAction;

export interface RestartAppAction {
  id: "restart-app";
}

export interface SummarizeInNewChatAction {
  id: "summarize-in-new-chat";
}

export interface WriteCodeProperlyAction {
  id: "write-code-properly";
}

export interface RefactorFileAction {
  id: "refactor-file";
  path: string;
}

export interface RebuildAction {
  id: "rebuild";
}

export interface RestartAction {
  id: "restart";
}

export interface RefreshAction {
  id: "refresh";
}

export interface KeepGoingAction {
  id: "keep-going";
}

export interface ActionProposal {
  type: "action-proposal";
  actions: SuggestedAction[];
}

export interface TipProposal {
  type: "tip-proposal";
  title: string;
  description: string;
}

export type Proposal = CodeProposal | ActionProposal | TipProposal;

export interface ProposalResult {
  proposal: Proposal;
  chatId: number;
  messageId: number;
}

export interface SqlQuery {
  content: string;
  description?: string;
}
