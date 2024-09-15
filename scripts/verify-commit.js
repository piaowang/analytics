// Invoked on the commit-msg git hook by yorkie.

const chalk = require('chalk')

const msgPath = process.env.GIT_PARAMS
const msg = require('fs').readFileSync(msgPath, 'utf-8').trim()

const commitRE = /^(((\ud83c[\udf00-\udfff])|(\ud83d[\udc00-\ude4f\ude80-\udeff])|[\u2600-\u2B55]) )?(revert: )?((feat|fix|style|docs|UI|refactor|⚡perf|workflow|build|CI|typos|chore|tests|types|wip|release|dep)(\(.+\))?: .{1,50})|(Merge branch.+)/

if (!commitRE.test(msg)) {
  console.log()
  console.error(
    `  ${chalk.bgRed.white(' ERROR ')} ${chalk.red('invalid commit message format.')}\n\n${chalk.red(
      '  Proper commit message format is required for automated changelog generation. Examples:\n\n'
    )}
${chalk.green('💥 feat(compiler): 新功能（feature）')}\n
${chalk.green('🐛 fix(compiler): 修复bug')}\n
${chalk.green('📝 docs(compiler): 文档（documentation）')}\n
${chalk.green('💄 UI(compiler): better styles')}\n
${chalk.green('💄 test(compiler): 添加或修改代码测试')}\n
${chalk.green('🎨 chore(compiler): 构建过程或辅助工具的变动')}\n
${chalk.green('🎨 style(compiler): 调整代码格式，未修改代码逻辑（比如修改空格、格式化、缺少分号等）')}\n
${chalk.green('🎨 perf(compiler): 性能优化，提高性能的代码更改')}\n
${chalk.green('🎨 refactor(compiler): 重构（即不是新增功能，也不是修改bug的代码变动）')}\n
${chalk.green('🎨 revert(compiler): 撤销上一次的commit')}\n
${chalk.green('Merge branch "xxx-branch" of xxx into xx-branch')}\n
${chalk.red('See .github/commit-convention.md for more details.\n')}`
  )
  process.exit(1)
}
