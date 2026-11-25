import fs from 'node:fs';
import path from 'node:path';

export interface PolicySection {
  title: string;
  content: string;
  keywords: string[];
}

/**
 * PolicyService — loads and searches docs/RETURN_POLICY.md via keyword matching.
 * Retrieved policy sections are returned as untrusted DATA, never as instructions.
 */
export class PolicyService {
  private sections: PolicySection[] | null = null;

  private loadSections(): PolicySection[] {
    if (this.sections) return this.sections;

    // Resolve docs/RETURN_POLICY.md relative to backend/ (or project root)
    const candidates = [
      path.resolve(process.cwd(), '../docs/RETURN_POLICY.md'),
      path.resolve(process.cwd(), 'docs/RETURN_POLICY.md'),
      path.resolve(__dirname, '../../../../docs/RETURN_POLICY.md'),
    ];

    const policyPath = candidates.find((p) => fs.existsSync(p));
    if (!policyPath) {
      return [];
    }

    const raw = fs.readFileSync(policyPath, 'utf-8');
    const blocks = raw.split(/\n## Section \d+:\s*/).slice(1);

    this.sections = blocks.map((block) => {
      const lines = block.trim().split('\n');
      const title = lines[0]?.trim() ?? 'Policy';
      const keywordLine = lines.find((l) => l.startsWith('**Keywords:**'));
      const keywords = keywordLine
        ? keywordLine
            .replace('**Keywords:**', '')
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter(Boolean)
        : [];
      const content = lines
        .filter((l) => !l.startsWith('**Keywords:**') && l.trim() !== '---')
        .slice(1)
        .join('\n')
        .trim();

      return { title, content, keywords };
    });

    return this.sections;
  }

  /**
   * Keyword search over policy sections.
   * Returns top matching sections (max 3).
   */
  searchPolicy(query: string): PolicySection[] {
    const sections = this.loadSections();
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length >= 2);

    if (terms.length === 0) {
      return sections.slice(0, 2);
    }

    const scored = sections.map((section) => {
      let score = 0;
      const haystack = `${section.title} ${section.content}`.toLowerCase();
      for (const term of terms) {
        if (section.keywords.some((k) => k.includes(term) || term.includes(k))) {
          score += 3;
        }
        if (haystack.includes(term)) {
          score += 1;
        }
      }
      return { section, score };
    });

    const matches = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.section);

    return matches.length > 0 ? matches : sections.slice(0, 2);
  }
}

export const policyService = new PolicyService();
