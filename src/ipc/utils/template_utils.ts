import { type Template, localTemplatesData } from "../../shared/templates";
import { appLog as log } from "@/lib/app_logger";

const logger = log.scope("template_utils");

// In-memory cache for API templates
let apiTemplatesCache: Template[] | null = null;
let apiTemplatesFetchPromise: Promise<Template[]> | null = null;

// Fetch templates from API with caching
export async function fetchApiTemplates(): Promise<Template[]> {
  // Return cached data if available
  if (apiTemplatesCache) {
    return apiTemplatesCache;
  }

  // Return existing promise if fetch is already in progress
  if (apiTemplatesFetchPromise) {
    return apiTemplatesFetchPromise;
  }

  // Start new fetch
  apiTemplatesFetchPromise = (async (): Promise<Template[]> => {
    logger.info("Using local templates only in the public release.");
    apiTemplatesCache = [];
    return [];
  })();

  return apiTemplatesFetchPromise;
}

// Get all templates (local + API)
export async function getAllTemplates(): Promise<Template[]> {
  const apiTemplates = await fetchApiTemplates();
  return [...localTemplatesData, ...apiTemplates];
}

export async function getTemplateOrThrow(
  templateId: string,
): Promise<Template> {
  const allTemplates = await getAllTemplates();
  const template = allTemplates.find((template) => template.id === templateId);
  if (!template) {
    throw new Error(
      `Template ${templateId} not found. Please select a different template.`,
    );
  }
  return template;
}
