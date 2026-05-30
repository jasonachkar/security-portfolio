import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = process.env.GITHUB_REPOSITORY_OWNER ?? 'jasonachkar';
const REPO = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'security-portfolio';
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, 'apps', 'reviewer-ui', 'src', 'data', 'generated');

const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

interface GhResult<T> {
  json: T;
  link: string | null;
}

async function gh<T>(path: string): Promise<GhResult<T>> {
  const response = await fetch(`${BASE}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API ${path || '/'}: ${response.status} ${response.statusText}`);
  }
  return { json: (await response.json()) as T, link: response.headers.get('link') };
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function countMatches(content: string, pattern: RegExp): number {
  return Array.from(content.matchAll(pattern)).length;
}

function countTests(dir: string, pattern: RegExp): number {
  return filesUnder(join(repoRoot, dir))
    .filter((path) => /\.(py|ts|tsx)$/.test(path))
    .reduce((total, path) => total + countMatches(readFileSync(path, 'utf8'), pattern), 0);
}

function testCounts() {
  const gateway = countTests('apps/gateway/test', /^\s*(?:it|test)\(/gm);
  const scanner = countTests('apps/vulnerability-scanner/tests', /^\s*(?:async\s+)?def\s+test_/gm);
  const network = countTests('apps/network-analyzer/tests', /^\s*(?:async\s+)?def\s+test_/gm);
  const orchestrator = countTests('apps/assessment-orchestrator/tests', /^\s*(?:async\s+)?def\s+test_/gm);
  return {
    gateway,
    scanner,
    network,
    orchestrator,
    total: gateway + scanner + network + orchestrator,
  };
}

function localLanguages(): string[] {
  const names: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.tf': 'HCL',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.css': 'CSS',
    '.html': 'HTML',
  };
  const found = new Set<string>();
  for (const file of filesUnder(repoRoot)) {
    if (file.includes(`${join('node_modules')}`) || file.includes(`${join('.git')}`)) {
      continue;
    }
    const language = names[extname(file)];
    if (language) {
      found.add(language);
    }
  }
  return Array.from(found).sort();
}

function lastPageFromLink(link: string | null): number | null {
  if (!link) {
    return null;
  }
  const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function localRecentCommits() {
  try {
    return git(['log', '-n', '10', '--pretty=format:%H%x1f%s%x1f%an%x1f%cI'])
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, message, author, date] = line.split('\x1f');
        return {
          sha: sha.slice(0, 7),
          message: message.slice(0, 80),
          author,
          date,
          url: `https://github.com/${OWNER}/${REPO}/commit/${sha}`,
        };
      });
  } catch {
    return [];
  }
}

function platformFacts() {
  const terraform = join(repoRoot, 'infra', 'azure', 'terraform', 'environments', 'dev', 'main.tf');
  const compose = join(repoRoot, 'infra', 'local', 'docker-compose.yml');
  const publicIngressCount = existsSync(terraform)
    ? countMatches(readFileSync(terraform, 'utf8'), /external_enabled\s*=\s*true/g)
    : 1;
  const localServices = existsSync(compose)
    ? ['gateway:', 'vulnerability-scanner:', 'network-analyzer:', 'assessment-orchestrator:'].filter((service) =>
        readFileSync(compose, 'utf8').includes(service),
      ).length
    : 4;
  return {
    publicIngressCount,
    activeServiceCount: localServices,
    deployModeCount: ['infra/local', 'infra/azure'].filter((path) => existsSync(join(repoRoot, path))).length,
  };
}

function gatewayFacts() {
  const configPath = join(repoRoot, 'apps', 'gateway', 'src', 'config.ts');
  if (!existsSync(configPath)) {
    return { accessTokenTtlMinutes: 15, roleCount: 3 };
  }
  const config = readFileSync(configPath, 'utf8');
  const ttlMatch = config.match(/ACCESS_TOKEN_TTL_SECONDS',\s*(\d+)/);
  const roleUnionMatch = config.match(/export type Role = ([^;]+);/);
  const ttlSeconds = ttlMatch ? Number.parseInt(ttlMatch[1], 10) : 900;
  const roleCount = roleUnionMatch ? Array.from(roleUnionMatch[1].matchAll(/'[^']+'/g)).length : 3;
  return {
    accessTokenTtlMinutes: Math.round(ttlSeconds / 60),
    roleCount,
  };
}

async function fetchGitHubStats() {
  const repo = await gh<any>('');
  const defaultBranch = repo.json.default_branch ?? 'main';
  const [languages, contributors, successRuns, latestRun, tags, commitsPage, recentCommits] = await Promise.all([
    gh<Record<string, number>>('/languages'),
    gh<any[]>('/contributors?per_page=100&anon=false'),
    gh<any>('/actions/runs?status=success&per_page=1'),
    gh<any>('/actions/runs?per_page=1'),
    gh<any[]>('/tags?per_page=1'),
    gh<any[]>(`/commits?per_page=1&sha=${defaultBranch}`),
    gh<any[]>(`/commits?per_page=10&sha=${defaultBranch}`),
  ]);

  return {
    stats: {
      generatedAt: new Date().toISOString(),
      dataSource: 'github-api',
      repository: `${OWNER}/${REPO}`,
      stars: repo.json.stargazers_count ?? 0,
      forks: repo.json.forks_count ?? 0,
      openIssues: repo.json.open_issues_count ?? 0,
      defaultBranch,
      createdAt: repo.json.created_at,
      pushedAt: repo.json.pushed_at,
      language: repo.json.language,
      languages: Object.keys(languages.json),
      contributorCount: contributors.json.length,
      commitCount: lastPageFromLink(commitsPage.link) ?? recentCommits.json.length,
      latestTag: tags.json[0]?.name ?? 'N/A',
      ciSuccessfulRuns: successRuns.json.total_count ?? 0,
      lastCiRunAt: latestRun.json.workflow_runs?.[0]?.updated_at ?? null,
      lastCiStatus: latestRun.json.workflow_runs?.[0]?.conclusion ?? null,
      testCounts: testCounts(),
      platform: platformFacts(),
      gateway: gatewayFacts(),
      warnings: [] as string[],
    },
    commits: recentCommits.json.map((commit: any) => ({
      sha: commit.sha.slice(0, 7),
      message: commit.commit.message.split('\n')[0].slice(0, 80),
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
    })),
  };
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  let payload;
  try {
    payload = await fetchGitHubStats();
  } catch (error) {
    const warning = error instanceof Error ? error.message : String(error);
    const branch = (() => {
      try {
        return git(['branch', '--show-current']);
      } catch {
        return 'unknown';
      }
    })();
    payload = {
      stats: {
        generatedAt: new Date().toISOString(),
        dataSource: 'local-fallback',
        repository: `${OWNER}/${REPO}`,
        stars: 0,
        forks: 0,
        openIssues: 0,
        defaultBranch: branch,
        createdAt: null,
        pushedAt: null,
        language: localLanguages()[0] ?? null,
        languages: localLanguages(),
        contributorCount: 0,
        commitCount: localRecentCommits().length,
        latestTag: 'N/A',
        ciSuccessfulRuns: 0,
        lastCiRunAt: null,
        lastCiStatus: null,
        testCounts: testCounts(),
        platform: platformFacts(),
        gateway: gatewayFacts(),
        warnings: [warning],
      },
      commits: localRecentCommits(),
    };
  }

  writeFileSync(
    join(outDir, 'githubStats.ts'),
    `// AUTO-GENERATED by scripts/fetch-github-stats.ts - DO NOT EDIT\n` +
      `// Last fetched: ${payload.stats.generatedAt}\n\n` +
      `export const GITHUB_STATS = ${JSON.stringify(payload.stats, null, 2)} as const;\n`,
  );

  writeFileSync(
    join(outDir, 'recentCommits.ts'),
    `// AUTO-GENERATED by scripts/fetch-github-stats.ts - DO NOT EDIT\n` +
      `// Repository: ${payload.stats.repository}\n\n` +
      `export interface RecentCommit {\n` +
      `  sha: string;\n` +
      `  message: string;\n` +
      `  author: string;\n` +
      `  date: string;\n` +
      `  url: string;\n` +
      `}\n\n` +
      `export const RECENT_COMMITS: RecentCommit[] = ${JSON.stringify(payload.commits, null, 2)};\n`,
  );

  console.log(
    `GitHub stats written from ${payload.stats.dataSource}: ${relative(repoRoot, join(outDir, 'githubStats.ts'))}`,
  );
  console.log(`Tests: ${payload.stats.testCounts.total} | Languages: ${payload.stats.languages.join(', ') || 'N/A'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
