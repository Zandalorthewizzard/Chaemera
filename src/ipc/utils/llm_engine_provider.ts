import { OpenAICompatibleChatLanguageModel } from "@ai-sdk/openai-compatible";
import { OpenAIResponsesLanguageModel } from "@ai-sdk/openai/internal";
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from "@ai-sdk/provider-utils";

import { appLog as log } from "@/lib/app_logger";
import { getExtraProviderOptions } from "./thinking_utils";
import type { UserSettings } from "../../lib/schemas";
import type { LanguageModel } from "ai";

const logger = log.scope("cloud_engine_provider");

export type ExampleChatModelId = string & {};
export interface ChatParams {
  providerId: string;
}
export interface ExampleProviderSettings {
  /**
Example API key.
*/
  apiKey?: string;
  /**
Base URL for the API calls.
*/
  baseURL?: string;
  /**
Custom headers to include in the requests.
*/
  headers?: Record<string, string>;
  /**
Optional custom url query parameters to include in request urls.
*/
  queryParams?: Record<string, string>;
  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
*/
  fetch?: FetchFunction;

  engineOptions: {
    enableLazyEdits?: boolean;
    enableSmartFilesContext?: boolean;
    enableWebSearch?: boolean;
  };
  settings: UserSettings;
}

export interface CloudEngineProvider {
  /**
Creates a model for text generation.
*/
  (modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;

  /**
Creates a chat model for text generation.
*/
  chatModel(modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;

  responses(modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;
}

export function createCloudEngine(
  options: ExampleProviderSettings,
): CloudEngineProvider {
  const baseURL = withoutTrailingSlash(options.baseURL);
  logger.info("creating cloud engine with baseURL", baseURL);

  // Track request ID attempts
  const requestIdAttempts = new Map<string, number>();

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "CHAEMERA_CLOUD_AI_API_KEY",
      description: "Example API key",
    })}`,
    ...options.headers,
  });

  interface CommonModelConfig {
    provider: string;
    url: ({ path }: { path: string }) => string;
    headers: () => Record<string, string>;
    fetch?: FetchFunction;
  }

  const getCommonModelConfig = (): CommonModelConfig => ({
    provider: `cloud-engine`,
    url: ({ path }) => {
      const url = new URL(`${baseURL}${path}`);
      if (options.queryParams) {
        url.search = new URLSearchParams(options.queryParams).toString();
      }
      return url.toString();
    },
    headers: getHeaders,
    fetch: options.fetch,
  });

  // Custom fetch implementation that adds dyad-specific options to the request
  const createCloudFetch = ({
    providerId,
  }: {
    providerId: string;
  }): FetchFunction => {
    return (input: RequestInfo | URL, init?: RequestInit) => {
      // Use default fetch if no init or body
      if (!init || !init.body || typeof init.body !== "string") {
        return (options.fetch || fetch)(input, init);
      }

      try {
        // Parse the request body to manipulate it
        const parsedBody = {
          ...JSON.parse(init.body),
          ...getExtraProviderOptions(providerId, options.settings),
        };
        const cloudVersionedFiles = parsedBody.cloudVersionedFiles;
        if ("cloudVersionedFiles" in parsedBody) {
          delete parsedBody.cloudVersionedFiles;
        }
        const cloudFiles = parsedBody.cloudFiles;
        if ("cloudFiles" in parsedBody) {
          delete parsedBody.cloudFiles;
        }
        const requestId = parsedBody.cloudRequestId;
        if ("cloudRequestId" in parsedBody) {
          delete parsedBody.cloudRequestId;
        }
        const cloudAppId = parsedBody.cloudAppId;
        if ("cloudAppId" in parsedBody) {
          delete parsedBody.cloudAppId;
        }
        const cloudDisableFiles = parsedBody.cloudDisableFiles;
        if ("cloudDisableFiles" in parsedBody) {
          delete parsedBody.cloudDisableFiles;
        }
        const cloudMentionedApps = parsedBody.cloudMentionedApps;
        if ("cloudMentionedApps" in parsedBody) {
          delete parsedBody.cloudMentionedApps;
        }
        const cloudSmartContextMode = parsedBody.cloudSmartContextMode;
        if ("cloudSmartContextMode" in parsedBody) {
          delete parsedBody.cloudSmartContextMode;
        }

        // Track and modify requestId with attempt number
        let modifiedRequestId = requestId;
        if (requestId) {
          const currentAttempt = (requestIdAttempts.get(requestId) || 0) + 1;
          requestIdAttempts.set(requestId, currentAttempt);
          modifiedRequestId = `${requestId}:attempt-${currentAttempt}`;
        }

        // Add files to the request if they exist
        if (!cloudDisableFiles) {
          parsedBody.cloud_options = {
            files: cloudFiles,
            versioned_files: cloudVersionedFiles,
            enable_lazy_edits: options.engineOptions.enableLazyEdits,
            enable_smart_files_context:
              options.engineOptions.enableSmartFilesContext,
            smart_context_mode: cloudSmartContextMode,
            enable_web_search: options.engineOptions.enableWebSearch,
            app_id: cloudAppId,
          };
          if (cloudMentionedApps?.length) {
            parsedBody.cloud_options.mentioned_apps = cloudMentionedApps;
          }
        }

        // Return modified request with files included and requestId in headers
        const modifiedInit = {
          ...init,
          headers: {
            ...init.headers,
            ...(modifiedRequestId && {
              "X-Request-Id": modifiedRequestId,
            }),
          },
          body: JSON.stringify(parsedBody),
        };

        // Use the provided fetch or default fetch
        return (options.fetch || fetch)(input, modifiedInit);
      } catch (e) {
        logger.error("Error parsing request body", e);
        // If parsing fails, use original request
        return (options.fetch || fetch)(input, init);
      }
    };
  };

  const createChatModel = (
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
  ) => {
    const config = {
      ...getCommonModelConfig(),
      fetch: createCloudFetch({ providerId: chatParams.providerId }),
    };

    return new OpenAICompatibleChatLanguageModel(modelId, config);
  };

  const createResponsesModel = (
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
  ) => {
    const config = {
      ...getCommonModelConfig(),
      fetch: createCloudFetch({ providerId: chatParams.providerId }),
    };

    return new OpenAIResponsesLanguageModel(modelId, config);
  };

  const provider = (modelId: ExampleChatModelId, chatParams: ChatParams) =>
    createChatModel(modelId, chatParams);

  provider.chatModel = createChatModel;
  provider.responses = createResponsesModel;

  return provider;
}
