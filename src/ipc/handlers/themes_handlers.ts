import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { createTypedHandler } from "./base";
import { templateContracts } from "../types/templates";
import { themesData } from "../../shared/themes";
import { db } from "../../db";
import { apps, customThemes } from "../../db/schema";

const THEME_IMAGES_DIR = path.join(os.tmpdir(), "dyad-theme-images");

function ensureThemeImagesDir() {
  if (!fs.existsSync(THEME_IMAGES_DIR)) {
    fs.mkdirSync(THEME_IMAGES_DIR, { recursive: true });
  }
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildPromptFromInput(params: {
  source: "images" | "url";
  sourceValue: string;
  keywords: string;
  generationMode: "inspired" | "high-fidelity";
}) {
  const modeText =
    params.generationMode === "high-fidelity"
      ? "High-fidelity visual matching"
      : "Inspired interpretation";

  return [
    "<theme>",
    `Style mode: ${modeText}.`,
    `Reference source (${params.source}): ${params.sourceValue}.`,
    `Keywords: ${params.keywords || "none provided"}.`,
    "Build an intentional, responsive UI direction with clear typography, spacing, and color hierarchy.",
    "</theme>",
  ].join("\n");
}

export function registerThemesHandlers() {
  createTypedHandler(templateContracts.getThemes, async () => {
    return themesData;
  });

  createTypedHandler(templateContracts.setAppTheme, async (_event, params) => {
    await db
      .update(apps)
      .set({ themeId: params.themeId })
      .where(eq(apps.id, params.appId));
  });

  createTypedHandler(templateContracts.getAppTheme, async (_event, params) => {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, params.appId),
    });
    return app?.themeId ?? null;
  });

  createTypedHandler(templateContracts.getCustomThemes, async () => {
    return db.select().from(customThemes);
  });

  createTypedHandler(
    templateContracts.createCustomTheme,
    async (_event, params) => {
      const [created] = await db
        .insert(customThemes)
        .values({
          name: params.name,
          description: params.description ?? null,
          prompt: params.prompt,
        })
        .returning();
      return created;
    },
  );

  createTypedHandler(
    templateContracts.updateCustomTheme,
    async (_event, params) => {
      const [existing] = await db
        .select()
        .from(customThemes)
        .where(eq(customThemes.id, params.id));
      if (!existing) {
        throw new Error(`Custom theme not found: ${params.id}`);
      }

      const [updated] = await db
        .update(customThemes)
        .set({
          name: params.name ?? existing.name,
          description:
            typeof params.description === "string"
              ? params.description
              : existing.description,
          prompt: params.prompt ?? existing.prompt,
          updatedAt: new Date(),
        })
        .where(eq(customThemes.id, params.id))
        .returning();

      return updated;
    },
  );

  createTypedHandler(
    templateContracts.deleteCustomTheme,
    async (_event, params) => {
      await db.delete(customThemes).where(eq(customThemes.id, params.id));
    },
  );

  createTypedHandler(
    templateContracts.generateThemePrompt,
    async (_event, params) => {
      const sourceValue =
        params.imagePaths.length > 0
          ? params.imagePaths.join(", ")
          : "no images provided";

      return {
        prompt: buildPromptFromInput({
          source: "images",
          sourceValue,
          keywords: params.keywords,
          generationMode: params.generationMode,
        }),
      };
    },
  );

  createTypedHandler(
    templateContracts.generateThemeFromUrl,
    async (_event, params) => {
      return {
        prompt: buildPromptFromInput({
          source: "url",
          sourceValue: params.url,
          keywords: params.keywords,
          generationMode: params.generationMode,
        }),
      };
    },
  );

  createTypedHandler(
    templateContracts.saveThemeImage,
    async (_event, params) => {
      ensureThemeImagesDir();
      const filename = sanitizeFilename(params.filename);
      const filepath = path.join(
        THEME_IMAGES_DIR,
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`,
      );

      const base64Payload = params.data.includes(",")
        ? params.data.split(",").at(-1)
        : params.data;
      const buffer = Buffer.from(base64Payload ?? "", "base64");

      await fs.promises.writeFile(filepath, buffer);
      return { path: filepath };
    },
  );

  createTypedHandler(
    templateContracts.cleanupThemeImages,
    async (_event, params) => {
      for (const candidate of params.paths) {
        const normalized = path.resolve(candidate);
        if (!normalized.startsWith(path.resolve(THEME_IMAGES_DIR))) {
          continue;
        }
        if (fs.existsSync(normalized)) {
          await fs.promises.unlink(normalized);
        }
      }
    },
  );
}
