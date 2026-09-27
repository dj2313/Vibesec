import fs from 'fs';
import path from 'path';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueCategory = 'secret' | 'dangerous_code' | 'git_hygiene' | 'dependency';

export interface SecurityIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
  recommendation: string;
}

export interface ProjectScanResult {
  projectDir: string;
  scannedFilesCount: number;
  durationMs: number;
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

interface SecretPattern {
  id: string;
  title: string;
  regex: RegExp;
  severity: IssueSeverity;
  recommendation: string;
}

interface CodePattern {
  id: string;
  title: string;
  regex: RegExp;
  severity: IssueSeverity;
  recommendation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: 'openai-api-key',
    title: 'Exposed OpenAI API Key',
    regex: /(?:sk-[a-zA-Z0-9_-]{20,}|sk-proj-[a-zA-Z0-9_-]{20,})/,
    severity: 'critical',
    recommendation: 'Remove hardcoded OpenAI API key and use environment variables or a secrets manager.',
  },
  {
    id: 'anthropic-api-key',
    title: 'Exposed Anthropic API Key',
    regex: /sk-ant-[a-zA-Z0-9_-]{20,}/,
    severity: 'critical',
    recommendation: 'Move Anthropic API key to .env or a secure vault.',
  },
  {
    id: 'aws-access-key',
    title: 'Exposed AWS Access Key ID',
    regex: /(?:AKIA[0-9A-Z]{16})/,
    severity: 'critical',
    recommendation: 'Revoke and rotate AWS access key. Store credentials in ~/.aws/credentials or IAM roles.',
  },
  {
    id: 'github-token',
    title: 'Exposed GitHub Personal Access Token',
    regex: /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,})/,
    severity: 'critical',
    recommendation: 'Revoke GitHub token immediately and load from environment secrets.',
  },
  {
    id: 'stripe-api-key',
    title: 'Exposed Stripe API Key',
    regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}/,
    severity: 'critical',
    recommendation: 'Rotate Stripe secret key and store in secure server-side environment configs.',
  },
  {
    id: 'slack-token',
    title: 'Exposed Slack Token / Webhook',
    regex: /(?:xox[baprs]-[0-9a-zA-Z]{10,}|https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[0-9a-zA-Z]+)/,
    severity: 'high',
    recommendation: 'Rotate Slack token/webhook and configure via environment variable.',
  },
  {
    id: 'private-key',
    title: 'Hardcoded Cryptographic Private Key',
    regex: /-----BEGIN (?:RSA |OPENSSH |EC |DSA |PGP |ENCRYPTED )?PRIVATE KEY-----/,
    severity: 'critical',
    recommendation: 'Do not commit private keys. Store in secure keystores or external secret managers.',
  },
  {
    id: 'database-uri-with-password',
    title: 'Database URI with Plaintext Credentials',
    regex: /(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[a-zA-Z0-9._-]+:[^@\s'"]+@[a-zA-Z0-9.-]+/,
    severity: 'high',
    recommendation: 'Inject database credentials securely using connection strings loaded from environment configs.',
  },
  {
    id: 'generic-hardcoded-secret',
    title: 'Hardcoded Secret / Password Assignment',
    regex: /(?:api[_-]?key|client[_-]?secret|password|auth[_-]?token|jwt[_-]?secret)\s*[:=]\s*['"`][a-zA-Z0-9_\-!@#$%^&*()]{10,}['"`]/i,
    severity: 'medium',
    recommendation: 'Verify if this is a real secret and replace with runtime environment variables.',
  },
];

const CODE_PATTERNS: CodePattern[] = [
  {
    id: 'eval-usage',
    title: 'Dangerous eval() Execution',
    regex: /\beval\s*\(/,
    severity: 'high',
    recommendation: 'Avoid eval() as it can lead to arbitrary code execution and injection attacks.',
  },
  {
    id: 'unsafe-exec',
    title: 'Unsanitized Shell Command Execution',
    regex: /(?:child_process\s*\.\s*exec\s*\(|execSync\s*\()\s*[`'"][^`'"]*\$\{/,
    severity: 'high',
    recommendation: 'Use execFile or spawn with parameterized arguments instead of raw string interpolation in exec.',
  },
  {
    id: 'root-deletion-risk',
    title: 'Destructive Root or Global Directory Deletion Pattern',
    regex: /rm\s+-rf\s+[\/\~]|rmdirSync\s*\(\s*['"][\/\\]['"]/,
    severity: 'critical',
    recommendation: 'Restrict directory deletion paths to dedicated temp or workspace directories.',
  },
];

export class ProjectScanner {
  constructor(private workingDir: string = process.cwd()) {}

  public async scan(options?: { maxFiles?: number }): Promise<ProjectScanResult> {
    const startTime = Date.now();
    const issues: SecurityIssue[] = [];
    const maxFiles = options?.maxFiles || 2000;

    const filesToScan: string[] = [];
    this.collectFiles(this.workingDir, filesToScan, maxFiles);

    // 1. Check Git & .env hygiene
    this.checkGitHygiene(issues);

    // 2. Scan file contents
    for (const filePath of filesToScan) {
      this.scanFile(filePath, issues);
    }

    const durationMs = Date.now() - startTime;

    const summary = {
      critical: issues.filter((i) => i.severity === 'critical').length,
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
      total: issues.length,
    };

    return {
      projectDir: this.workingDir,
      scannedFilesCount: filesToScan.length,
      durationMs,
      issues,
      summary,
    };
  }

  private collectFiles(dir: string, fileList: string[], maxFiles: number): void {
    if (fileList.length >= maxFiles) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (fileList.length >= maxFiles) break;

        const fullPath = path.join(dir, entry.name);
        const relativeName = entry.name;

        // Skip ignored directories
        if (
          entry.isDirectory() &&
          ['node_modules', '.git', 'dist', 'build', '.vibesec', '.cache', '.next', '.nuxt', 'coverage', '.turbo'].includes(
            relativeName
          )
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          this.collectFiles(fullPath, fileList, maxFiles);
        } else if (entry.isFile()) {
          // Check file extension / skip binary files
          if (this.isScannableFile(entry.name)) {
            fileList.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore unreadable directory
    }
  }

  private isScannableFile(fileName: string): boolean {
    const ignoredExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf',
      '.eot', '.mp3', '.mp4', '.zip', '.tar', '.gz', '.db', '.sqlite', '.pdf',
      '.lock', '.exe', '.dll', '.so', '.dylib', '.bin'
    ];
    const ext = path.extname(fileName).toLowerCase();
    if (ignoredExtensions.includes(ext)) return false;

    return true;
  }

  private checkGitHygiene(issues: SecurityIssue[]): void {
    const gitignorePath = path.join(this.workingDir, '.gitignore');
    const envPath = path.join(this.workingDir, '.env');
    const envProdPath = path.join(this.workingDir, '.env.production');

    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    }

    const ignoresEnv = gitignoreContent.includes('.env');

    if (fs.existsSync(envPath) && !ignoresEnv) {
      issues.push({
        id: 'env-not-gitignored',
        category: 'git_hygiene',
        severity: 'critical',
        title: '.env File Not In .gitignore',
        file: '.env',
        recommendation: 'Add .env and .env.* to your .gitignore immediately to prevent secret leakage.',
      });
    }

    if (fs.existsSync(envProdPath) && !ignoresEnv) {
      issues.push({
        id: 'env-prod-exposed',
        category: 'git_hygiene',
        severity: 'critical',
        title: 'Production Environment File Exposed',
        file: '.env.production',
        recommendation: 'Ensure production secrets are never committed to version control.',
      });
    }
  }

  private scanFile(filePath: string, issues: SecurityIssue[]): void {
    try {
      const stats = fs.statSync(filePath);
      // Skip files larger than 1MB
      if (stats.size > 1024 * 1024) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(this.workingDir, filePath);

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const lineNum = i + 1;

        // Skip commented test patterns or mock files
        if (relPath.includes('test') || relPath.includes('fixture')) {
          // In test files, only check for real credentials, skip generic patterns
        }

        // 1. Check Secret Patterns
        for (const pattern of SECRET_PATTERNS) {
          const match = pattern.regex.exec(lineText);
          if (match) {
            issues.push({
              id: pattern.id,
              category: 'secret',
              severity: pattern.severity,
              title: pattern.title,
              file: relPath,
              line: lineNum,
              column: match.index + 1,
              snippet: this.maskSnippet(lineText.trim()),
              recommendation: pattern.recommendation,
            });
          }
        }

        // 2. Check Dangerous Code Patterns (skip in tests/fixtures)
        if (!relPath.startsWith('tests' + path.sep) && !relPath.startsWith('test' + path.sep)) {
          for (const pattern of CODE_PATTERNS) {
            const match = pattern.regex.exec(lineText);
            if (match) {
              issues.push({
                id: pattern.id,
                category: 'dangerous_code',
                severity: pattern.severity,
                title: pattern.title,
                file: relPath,
                line: lineNum,
                column: match.index + 1,
                snippet: lineText.trim().slice(0, 120),
                recommendation: pattern.recommendation,
              });
            }
          }
        }
      }
    } catch {
      // Ignore unreadable file
    }
  }

  private maskSnippet(snippet: string): string {
    return snippet.replace(/(sk-[a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]+/g, '$1********')
      .replace(/(AKIA[0-9A-Z]{4})[0-9A-Z]+/g, '$1********')
      .replace(/(ghp_[a-zA-Z0-9]{4})[a-zA-Z0-9]+/g, '$1********');
  }
}
