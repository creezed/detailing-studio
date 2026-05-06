import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Inject, Injectable } from '@nestjs/common';
import { I18nLoader, I18N_LOADER_OPTIONS } from 'nestjs-i18n';

import type { I18nTranslation } from 'nestjs-i18n';

export interface MultiPathI18nOptions {
  readonly paths: readonly string[];
}

@Injectable()
export class MultiPathI18nLoader extends I18nLoader {
  constructor(
    @Inject(I18N_LOADER_OPTIONS)
    private readonly _options: MultiPathI18nOptions,
  ) {
    super();
  }

  async languages(): Promise<string[]> {
    const langs = new Set<string>();

    for (const dir of this._options.paths) {
      const files = await readdir(dir).catch(() => [] as string[]);

      for (const file of files) {
        if (file.endsWith('.json')) {
          langs.add(file.replace('.json', ''));
        }
      }
    }

    return [...langs];
  }

  async load(): Promise<I18nTranslation> {
    const result: I18nTranslation = {};

    for (const dir of this._options.paths) {
      const files = await readdir(dir).catch(() => [] as string[]);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const lang = file.replace('.json', '');
        const raw = await readFile(join(dir, file), 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, string>;

        result[lang] = { ...(result[lang] as Record<string, string> | undefined), ...parsed };
      }
    }

    return result;
  }
}
