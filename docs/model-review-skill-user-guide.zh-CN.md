# model-review-skill 中文用户手册

这是一份面向非开发人员的使用说明。你不需要会编程，也不需要记住命令；大多数操作都可以直接用中文告诉 Codex，让 Codex 帮你完成。

## 1. 这个工具能做什么

`model-review-skill` 可以把 Codex 当前正在处理的代码、方案或问题，交给另一个大模型做一次独立检查。它支持：

- 代码审查：查找程序错误、安全风险和兼容性问题；
- 方案审查：检查开发计划是否遗漏步骤或存在不合理假设；
- 架构审查：检查系统设计、模块边界和长期维护风险；
- Bug 诊断：让外部模型协助分析故障原因和排查方向；
- 测试设计：补充应当测试的场景、边界条件和失败路径；
- 多模型对比：让不同厂商或本地模型分别给出意见，再由 Codex 核对和汇总。

外部模型只有“阅读并提出建议”的权限，不能操作你的电脑、运行命令或修改文件。Codex 也不会因为外部模型提出了建议就自动改代码；是否修改以及如何修改，仍由你和 Codex 决定。

## 2. 开始前需要准备什么

你需要准备：

1. 已经可以正常使用的 Codex；
2. 一个需要检查的项目文件夹；
3. 至少一个模型平台的 API Key，例如 DeepSeek、Claude、Gemini、OpenAI 或其他兼容平台；本地无认证模型可以不需要 Key；
4. 对应平台可用的模型名称和可用余额。

API Key 可以理解为模型平台发给你的“专用密码”。调用外部模型通常会产生费用，费用由模型平台收取，与本项目无关。请先在平台控制台查看价格、额度和数据政策。

官方入口：

- [DeepSeek 开放平台](https://platform.deepseek.com/)
- [Anthropic Console（Claude）](https://console.anthropic.com/)
- [Google AI Studio（Gemini）](https://aistudio.google.com/)

只需要选择一个平台，不必同时注册多个。除 Claude、Gemini 的原生接口外，Skill 还支持采用 OpenAI Chat Completions 兼容接口的云平台和本地模型服务。

## 3. 安装 Skill

### 3.1 Windows 用户

从本仓库下载后，找到下面这个目录：

```text
skills\model-review-skill
```

把整个 `model-review-skill` 文件夹复制到：

```text
C:\Users\你的Windows用户名\.codex\skills\model-review-skill
```

例如，Windows 用户名是 `xiaoming`，目标路径就是：

```text
C:\Users\xiaoming\.codex\skills\model-review-skill
```

如果看不到 `.codex` 文件夹，可以在文件资源管理器地址栏直接粘贴 `%USERPROFILE%\.codex\skills` 并按回车。目录不存在时可以新建。

复制完成后，完全退出并重新打开 Codex。

你也可以直接对 Codex 说：

```text
请把 E:\Codex\skills\skills\model-review-skill 安装到我的 Codex skills 目录。
```

请把示例中的源路径替换为你电脑上的实际路径。

### 3.2 macOS 或 Linux 用户

把 `skills/model-review-skill` 目录复制到：

```text
~/.codex/skills/model-review-skill
```

然后重启 Codex。

## 4. 为项目创建配置文件

每个需要使用外部模型评审的项目，都要有自己的本地配置文件。这样不同项目可以使用不同模型，而且 API Key 不会写进 Skill 本身。

下面的步骤只需要在每个项目中做一次。

### 第一步：让 Codex 打开项目

在 Codex 中打开需要评审的项目文件夹，然后告诉 Codex：

```text
请为这个项目配置 model-review-skill。先只创建配置文件和 Git 忽略规则，不要调用外部模型。
```

Codex 应当在项目中创建：

```text
.codex/model-review.local.json
```

并在项目的 `.gitignore` 中加入：

```gitignore
.codex/model-review.local.json
.codex/reviews/
```

这两条规则非常重要。Skill 会拒绝使用已经被 Git 跟踪或没有被 Git 忽略的配置文件，防止 API Key 被误传到 GitHub。

### 第二步：只保留你要使用的平台

配置文件是 JSON 格式。新手建议只配置一个平台，并删除其他平台的配置，减少出错机会。

DeepSeek 示例：

```json
{
  "defaultProvider": "deepseek",
  "baseBranch": "main",
  "includeUntracked": false,
  "limits": {
    "maxContextChars": 120000,
    "timeoutMs": 60000
  },
  "providers": {
    "deepseek": {
      "type": "deepseek",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "在这里粘贴你的API Key",
      "model": "在这里填写控制台显示的可用模型名称"
    }
  }
}
```

Claude 示例：

```json
{
  "defaultProvider": "claude",
  "baseBranch": "main",
  "includeUntracked": false,
  "limits": {
    "maxContextChars": 120000,
    "timeoutMs": 60000
  },
  "providers": {
    "claude": {
      "type": "claude",
      "baseUrl": "https://api.anthropic.com/v1",
      "apiKey": "在这里粘贴你的API Key",
      "model": "在这里填写控制台显示的可用模型名称",
      "apiVersion": "2023-06-01",
      "maxTokens": 4096
    }
  }
}
```

Gemini 示例：

```json
{
  "defaultProvider": "gemini",
  "baseBranch": "main",
  "includeUntracked": false,
  "limits": {
    "maxContextChars": 120000,
    "timeoutMs": 60000
  },
  "providers": {
    "gemini": {
      "type": "gemini",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
      "apiKey": "在这里粘贴你的API Key",
      "model": "在这里填写控制台显示的可用模型名称"
    }
  }
}
```

其他厂商或本地模型示例：

```json
{
  "defaultProvider": "my-provider",
  "baseBranch": "main",
  "includeUntracked": false,
  "limits": {
    "maxContextChars": 120000,
    "timeoutMs": 60000
  },
  "providers": {
    "my-provider": {
      "type": "openai-compatible",
      "baseUrl": "从厂商文档复制兼容接口地址",
      "apiKey": "在这里粘贴你的API Key",
      "model": "从厂商控制台复制模型名称"
    }
  }
}
```

这个通用类型可以用于 OpenAI、Azure OpenAI、OpenRouter、Groq、Mistral、xAI，以及提供兼容接口的通义千问、Moonshot 等平台。具体兼容性以厂商当前文档为准，不要根据名称猜测接口地址。

Ollama、LM Studio、vLLM 等本地服务如果开放了兼容接口，可以使用无认证配置：

```json
{
  "type": "openai-compatible",
  "baseUrl": "http://localhost:11434/v1",
  "model": "本地模型名称",
  "auth": { "type": "none" }
}
```

如果厂商要求 `api-key` 请求头、自定义路径或额外参数，让 Codex 根据该厂商官方文档设置 `auth`、`endpointPath`、`headers` 和 `extraBody`。不要把 API Key 直接写进 URL。

不要照抄某篇旧教程中的模型名称。模型可能升级、下线或因账户而异，应从平台控制台或官方文档复制当前可用的模型名称。

### 第三步：保存配置并做安全检查

告诉 Codex：

```text
请检查 model-review-skill 配置是否有效，并确认配置文件没有被 Git 跟踪。不要显示 API Key，也不要调用模型。
```

编辑 JSON 时请注意：

- 所有文字必须使用英文双引号 `"`；
- 每一项之间需要英文逗号；
- 最后一项后面不要加逗号；
- JSON 文件中不能写注释；
- 不要把整个配置文件粘贴到聊天、邮件或问题报告中。

## 5. 第一次进行代码审查

最简单的方式是使用自然语言。完成一些代码修改后，对 Codex 说：

```text
使用 $model-review-skill，让 DeepSeek 审查当前未提交的代码。调用前先告诉我会发送哪些文件，得到结果后请你逐条核实，不要自动修改代码。
```

如果配置的是其他云端或本地模型，把示例中的模型名称替换掉即可。

正常流程如下：

1. Codex 说明将使用哪个平台、检查哪些内容以及最大内容长度；
2. Skill 把指定范围发送给外部模型；
3. 外部模型返回结构化建议；
4. Codex 回到本地代码中核实每一条建议；
5. Codex 告诉你哪些问题成立、哪些不成立、哪些需要进一步确认；
6. 只有你要求修复时，Codex 才修改代码并运行测试。

如果只想检查、不想修改，可以明确说：

```text
只做审查和解释，不要修改任何文件。
```

## 6. 五种常用场景

### 6.1 审查当前尚未提交的代码

```text
使用 $model-review-skill，让 Claude 审查当前工作区改动。先说明发送范围，审查后由你核实结果，不要自动修改。
```

适用于刚写完代码、还没有执行 Git 提交的情况。

### 6.2 审查当前分支相对主分支的全部改动

```text
使用 $model-review-skill，让 DeepSeek 审查当前分支相对 main 的全部已提交改动。
```

这种方式要求当前工作区没有尚未提交的修改，否则 Skill 会停止，避免漏掉本地代码。若项目的主分支叫 `master`，请把 `main` 换成 `master`。

### 6.3 审查开发计划

```text
使用 $model-review-skill，让 Gemini 对 docs/plan.md 做 plan-review，重点检查遗漏步骤、错误假设和不可验证的目标。
```

请把 `docs/plan.md` 换成真实文件路径。

### 6.4 协助诊断 Bug

```text
使用 $model-review-skill，让 Claude 对 docs/bug-context.md 做 bug-diagnosis。请你先确认文件中没有密码或个人信息，再调用模型。
```

为了得到更可靠的建议，Bug 说明文件最好包括：现象、复现步骤、错误信息、预期结果以及已经尝试的方法。

### 6.5 设计测试用例

```text
使用 $model-review-skill，让 DeepSeek 对当前分支做 test-design，列出最重要的正常、边界和失败场景。不要直接编写测试，先给我确认。
```

## 7. 同时使用多个模型

如果配置文件中已经正确配置多个平台，可以说：

```text
使用 $model-review-skill，让 DeepSeek、Claude 和 Gemini 分别审查当前未提交代码。不要让后一个模型看到前一个模型的结论。最后由你核实、去重并汇总分歧。
```

多个模型会分别产生结果，不会互相覆盖。Codex 负责：

- 合并重复问题；
- 核对问题是否真的存在；
- 标出不同模型的分歧；
- 根据代码证据给出最终判断。

多模型调用会消耗更多额度。建议先用一个模型，只有高风险改动或重要发布前再使用多个模型。

## 8. 评审范围是什么意思

Skill 有三种常见输入方式：

| 使用场景 | 通俗解释 | 注意事项 |
| --- | --- | --- |
| 当前工作区 | 尚未提交的代码改动 | 默认不包含新建但未纳入 Git 的文件 |
| 当前分支 | 当前分支相对主分支的已提交改动 | 工作区必须干净 |
| 指定文件 | 某一份计划、设计或 Bug 说明 | 只发送指定文件 |

### 为什么默认不发送未跟踪文件

“未跟踪文件”是新建但还没有加入 Git 的文件，其中可能包含临时记录、密钥或个人数据。Skill 默认停止并列出这些文件，而不是悄悄发送。

确认文件安全且确实需要审查时，可以说：

```text
这些未跟踪文件可以发送，请在本次审查中包含它们。
```

不要把 `includeUntracked` 永久改成 `true`，除非你理解风险并且确实需要这样做。

## 9. 如何阅读审查结果

外部模型通常会给出问题位置、严重程度、原因、证据和建议。常见严重程度可以这样理解：

- 严重：可能造成数据丢失、安全漏洞、服务中断或核心功能错误；
- 高：常见使用路径可能失败，发布前应优先处理；
- 中：特定条件下会出现错误，或明显降低可维护性；
- 低：影响较小，可以根据时间决定是否处理。

模型给出的结论不等于事实。你应当关注 Codex 核实后的判断，而不是只看外部模型的措辞。可以继续追问：

```text
请用小白能理解的语言解释第 2 条问题，并指出代码证据和最小修复方案。
```

或者：

```text
只修复已经确认成立的严重和高优先级问题，修复后运行测试并再次检查。
```

## 10. 更换或新增模型

### 同一平台更换新模型

新模型发布后，一般不需要修改 Skill。只需把配置中的 `model` 改成平台提供的新模型名称。例如：

```json
"model": "从平台控制台复制的新模型名称"
```

保存后，下次审查就会使用新模型。Skill 不会在失败时偷偷切换到其他模型，也不会自动猜测模型名称。

### 增加同一平台的第二个模型

可以在 `providers` 中添加另一个名字，例如 `claude-fast` 和 `claude-deep`，两项都使用 `type: "claude"`，但填写不同的 `model`。然后在请求中明确指定想用哪一个。

这属于稍高级的配置，建议直接告诉 Codex：

```text
请在不显示或改动现有 API Key 的前提下，为 model-review-skill 增加一个同平台的新模型配置，并检查 JSON 是否有效。
```

### 增加全新的模型平台

先查看新平台是否提供 OpenAI-compatible 或 OpenAI Chat Completions 兼容接口。如果提供，只需新增一个 `type: "openai-compatible"` 的配置，不需要修改 Skill 代码。

可以直接告诉 Codex：

```text
请根据这个模型厂商的官方 API 文档，为 model-review-skill 新增一个 openai-compatible provider 配置。不要读取或输出其他 provider 的 API Key；配置后只做格式与安全检查，不要立即产生付费调用。
```

如果厂商使用完全不同的请求和响应协议，才需要编写新的 provider adapter。请让开发人员或 Codex 按以下文档扩展：

```text
skills/model-review-skill/references/provider-extension.md
```

## 11. 常见问题和解决办法

### 提示找不到配置文件

确认项目中存在：

```text
.codex/model-review.local.json
```

注意文件名必须完全一致，不要被 Windows 保存成 `model-review.local.json.txt`。

### 提示配置文件未被忽略或已被 Git 跟踪

先确认 `.gitignore` 中有：

```gitignore
.codex/model-review.local.json
.codex/reviews/
```

如果文件曾经被提交过，仅加入 `.gitignore` 还不够。不要自行尝试删除历史记录，直接告诉 Codex：

```text
配置文件可能被 Git 跟踪了。请安全地停止跟踪它但保留本地文件，并检查是否存在密钥泄露；操作前先向我说明影响。
```

如果 API Key 已上传到远程仓库，应立即在模型平台撤销旧 Key 并创建新 Key。

### 提示存在未跟踪文件

Skill 在保护你，避免遗漏审查或发送未知文件。让 Codex 列出文件并逐个说明用途，再决定是否加入本次审查。

### 提示工作区不干净

你选择了“当前分支”审查，但还有未提交改动。可以改为审查“当前工作区”，也可以先完成提交后再审查分支。不要为了消除提示而随意丢弃改动。

### 返回 401 或 403

通常表示 API Key 错误、已失效、没有权限，或账户未开通相应模型。去平台控制台检查 Key 和模型权限。

### 返回 429

通常表示额度不足、调用过快或达到了平台限制。检查余额和限额，稍后再试。Skill 不会自动改用另一个付费模型。

### 提示超时

可能是网络不稳定、模型响应较慢或发送内容太多。可以先缩小审查范围。确实需要时，再把 `timeoutMs` 调大，例如从 `60000` 改为 `120000`。

### 提示内容超过限制

默认最多发送约 120000 个字符。优先只审查关键文件或拆成几次审查，不建议盲目提高上限，因为内容越多，费用越高，模型也越难聚焦。

### 提示模型不存在或不可用

到平台控制台复制当前账户可用的准确模型名称，更新配置中的 `model`。不要让 Codex 凭空猜测名称。

### 提示 JSON 格式错误

常见原因是漏逗号、使用中文引号、最后一项多了逗号。告诉 Codex：

```text
请检查 .codex/model-review.local.json 的 JSON 格式。不要输出、复制或修改 API Key，只修复格式问题。
```

### 提示找不到 Node.js

先完全退出并重新打开 Codex。如果仍然失败，让 Codex 检查可用的 Node.js 运行环境。只有确认电脑确实没有时，再从 [Node.js 官网](https://nodejs.org/) 安装当前 LTS 版本。

## 12. 隐私和费用安全

使用前请记住：

1. 发送范围内的代码或文档会离开本机，传到你选择的模型平台；
2. 不要发送密码、API Key、身份证号、客户资料、私有合同或其他敏感信息；
3. 配置文件以明文保存 API Key，因此必须依赖本机账号权限和 Git 忽略规则保护；
4. 不要截图、上传或复制整个配置文件；
5. 怀疑 Key 泄露时，应立即在平台撤销并更换；
6. 每次扩大文件范围或改用其他平台前，都应让 Codex 重新说明将发送的内容；
7. 外部模型的回答可能错误，必须由 Codex 结合本地证据核实；
8. 多模型审查会产生多次调用和更多费用。

## 13. 更新和卸载

### 更新 Skill

下载新版本后，用新的 `model-review-skill` 文件夹替换 Codex skills 目录中的旧版本，然后重启 Codex。项目内的 `.codex/model-review.local.json` 不在 Skill 目录里，不会因此被覆盖。

更新前建议备份 Skill 目录；不要把项目的 API Key 配置复制进 Skill 目录。

### 卸载 Skill

退出 Codex，删除以下目录，然后重新打开 Codex：

```text
C:\Users\你的Windows用户名\.codex\skills\model-review-skill
```

卸载 Skill 不会删除各项目中的本地配置。确认以后不再使用时，可以自行删除项目中的 `.codex/model-review.local.json` 和 `.codex/reviews/`。

## 14. 新手推荐使用模板

第一次使用，直接把下面这段话发给 Codex：

```text
请使用 $model-review-skill 审查当前未提交的代码。

要求：
1. 使用配置文件中的默认模型；
2. 调用前告诉我将发送哪些文件、使用哪个平台以及最大内容长度；
3. 如果包含未跟踪文件或敏感信息，先停止并提醒我；
4. 外部模型返回后，请你根据本地代码逐条核实；
5. 用小白能理解的中文说明确认成立的问题；
6. 不要自动修改文件，也不要自动调用其他付费模型。
```

当你确认问题并希望修复时，再说：

```text
请只修复已经确认成立的问题，保持改动尽量小；修复后运行项目现有测试，并告诉我每项结果。
```

## 15. 使用前检查清单

第一次调用前，逐项确认：

- [ ] Skill 已复制到 Codex skills 目录，并已重启 Codex；
- [ ] 项目中存在 `.codex/model-review.local.json`；
- [ ] 配置文件已经被 `.gitignore` 忽略；
- [ ] API Key 和模型名称来自官方平台；
- [ ] 账户有可用额度，并了解调用可能收费；
- [ ] 即将发送的文件不含密钥和敏感数据；
- [ ] 已让 Codex 在调用前说明平台和发送范围；
- [ ] 明白外部模型只是提供建议，最终结论需要核实。

完成以上检查后，就可以安全地开始第一次外部模型审查。
