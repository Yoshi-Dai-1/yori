import type { Plugin } from "@opencode-ai/plugin"

const CODE_FILE_PATTERN = /\.(ts|js|tsx|jsx|py|go|rs|java|kt|c|cpp|cs|rb|swift|php|css|scss)$/

const CONVENTION_FILES = [
  { name: "naming-conventions", filePath: ".opencode/instructions/naming-conventions.md" },
  { name: "directory-structure", filePath: ".opencode/instructions/directory-structure.md" },
  { name: "coding-conventions", filePath: ".opencode/coding-conventions.md" },
]

interface RuleDef {
  name: string
  filePath: string
  filePattern?: RegExp
  contentPatterns?: RegExp[]
}

const RULES: RuleDef[] = [
  {
    name: "code-quality",
    filePath: ".opencode/instructions/code-quality.md",
    filePattern: CODE_FILE_PATTERN,
  },
  {
    name: "security",
    filePath: ".opencode/instructions/security.md",
    filePattern: /\.(ts|js|tsx|jsx|py|go|rs|java|kt|c|cpp|cs|rb|swift|php)$|docs\/project-definition\.md$|AGENTS\.md$|package\.json$|requirements.*\.txt$|.*\.toml$|Gemfile$|composer\.json$|pubspec\.yaml$|.*\.csproj$|packages\.config$|go\.mod$|pom\.xml$|build\.gradle.*$/,
    contentPatterns: [
      /login/i, /auth/i, /signin/i, /password/i, /token/i, /session/i,
      /jwt/i, /oauth/i, /api[_-]?key/i, /secret/i, /bearer/i,
      /authorization/i, /webhook/i, /credit/i, /card/i, /stripe/i,
      /payment/i, /billing/i, /charge/i, /checkout/i,
    ],
  },
  {
    name: "network-resilience",
    filePath: ".opencode/instructions/network-resilience.md",
    filePattern: /\.(ts|js|tsx|jsx|py|go|rs|java|kt|c|cpp|cs|rb|swift|php)$|ARCHITECTURE\.md$|docs\/project-definition\.md$/,
    contentPatterns: [
      /fetch/i, /axios/i, /requests/i, /http\.client/i, /net\/http/i,
      /reqwest/i, /HttpClient/i, /timeout/i, /retry/i,
      /circuit.?breaker/i, /redis/i, /rabbitmq/i, /kafka/i, /sqs/i,
    ],
  },
  {
    name: "design-contract",
    filePath: ".opencode/instructions/design-contract.md",
    filePattern: /\.(tsx|jsx|css|scss)$|DESIGN\.md$|design\/.*\.json$/,
  },
  {
    name: "stack-setup",
    filePath: ".opencode/instructions/stack-setup.md",
    filePattern: /ARCHITECTURE\.md$/i,
  },
  {
    name: "tdd-cycle",
    filePath: ".opencode/instructions/tdd-cycle.md",
    filePattern: /\.test\.(ts|js|tsx|jsx|py|go|rs|cpp|c|rb)$|_test\.(go|py|rs|cpp|c|rb)$|test_.*\.(py|rs|c|cpp)$|(\.|_)spec\.(ts|js|tsx|jsx|py|rb)$|(Test|Tests|Spec)\.(java|kt|cs|swift|php|c|cpp)$/i,
    contentPatterns: [/test/i, /spec/i, /tdd/i, /describe\(/i, /it\(/i, /assert/i, /expect/i, /func Test/i, /#\[test\]/i],
  },
]

interface RuleSessionState {
  injected: boolean
  readByAI: boolean
}

interface SessionState {
  conventionsOffered: boolean
  conventionsRead: Set<string>
  rules: Map<string, RuleSessionState>
}

const sessions = new Map<string, SessionState>()

function getSession(sessionId: string): SessionState {
  let s = sessions.get(sessionId)
  if (!s) {
    s = {
      conventionsOffered: false,
      conventionsRead: new Set(),
      rules: new Map(),
    }
    sessions.set(sessionId, s)
  }
  return s
}

function getRuleState(session: SessionState, ruleName: string): RuleSessionState {
  let rs = session.rules.get(ruleName)
  if (!rs) {
    rs = { injected: false, readByAI: false }
    session.rules.set(ruleName, rs)
  }
  return rs
}

function extractFileAndContent(
  tool: string,
  args: Record<string, any>,
): Array<{ filePath: string; content: string }> {
  if (tool === "multiedit") {
    return (args.operations || []).map((op: any) => ({
      filePath: op.filePath || op.path || "",
      content: op.content || op.newString || "",
    }))
  }
  return [
    {
      filePath: args.filePath || args.path || "",
      content: tool === "write" ? args.content || "" : args.newString || args.content || "",
    },
  ]
}

function contentMatchesAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(content))
}

function isReadOfRule(fp: string, filePath: string): boolean {
  if (fp.includes(filePath)) return true
  const stripped = filePath.replace(/^\.opencode\//, "")
  if (fp.includes(stripped)) return true
  const bareName = stripped.split("/").pop() || ""
  if (bareName && fp.endsWith(bareName)) return true
  return false
}

export const RuleInjectorPlugin: Plugin = async ({ client }) => ({
  "tool.execute.before": async (input, output) => {
    const sessionId = (input as any).sessionID
    if (!sessionId) return

    // === Read tracking ===
    if (input.tool === "read") {
      const fp = output.args.filePath || output.args.path || ""
      if (!fp) return
      const session = getSession(sessionId)

      for (const cf of CONVENTION_FILES) {
        if (isReadOfRule(fp, cf.filePath)) {
          session.conventionsRead.add(cf.name)
        }
      }
      for (const rule of RULES) {
        if (isReadOfRule(fp, rule.filePath)) {
          getRuleState(session, rule.name).readByAI = true
        }
      }
      return
    }

    // === Write/edit/multiedit handling ===
    if (!["write", "edit", "multiedit"].includes(input.tool)) return

    const session = getSession(sessionId)
    const ops = extractFileAndContent(input.tool, output.args)

    for (const { filePath: fp, content } of ops) {
      if (!fp) continue

      // === First-write block for conventions ===
      if (!session.conventionsOffered && CODE_FILE_PATTERN.test(fp)) {
        session.conventionsOffered = true
        const unread = CONVENTION_FILES.filter((cf) => !session.conventionsRead.has(cf.name))
        if (unread.length > 0) {
          throw new Error(
            `[rule-injector] 初回コードファイル書き込みを検出しました。以下のコーディング規約を読んでから再度作成してください：\n` +
              unread.map((cf) => `  - ${cf.filePath}`).join("\n"),
          )
        }
      }

      // === Individual rule injection ===
      for (const rule of RULES) {
        if (!rule.filePattern?.test(fp)) continue

        const state = getRuleState(session, rule.name)

        if (!state.injected) {
          state.injected = true
          state.readByAI = false
          const tag = rule.contentPatterns ? "（内容依存・該当時のみ）" : ""
          await client.session.prompt({
            path: { id: sessionId },
            body: {
              noReply: true,
              parts: [
                {
                  type: "text",
                  text: `[rule-injector] ${rule.name}: ${rule.filePath} を確認してください${tag}`,
                },
              ],
            },
          })
        } else if (!state.readByAI) {
          state.readByAI = false
          await client.session.prompt({
            path: { id: sessionId },
            body: {
              noReply: true,
              parts: [
                {
                  type: "text",
                  text: `[rule-injector] ${rule.name}: ${rule.filePath} が未読です — read して確認してください`,
                },
              ],
            },
          })
        } else if (rule.contentPatterns && content && contentMatchesAny(content, rule.contentPatterns)) {
          state.readByAI = false
          await client.session.prompt({
            path: { id: sessionId },
            body: {
              noReply: true,
              parts: [
                {
                  type: "text",
                  text: `[rule-injector] ${rule.name}: ${rule.filePath} で定義されたパターンに該当するコードを検出しました — 該当ルールを再読してください`,
                },
              ],
            },
          })
        }
      }
    }
  },
})
