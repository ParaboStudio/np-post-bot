#!/bin/bash
# CLI快捷脚本

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 如果是开发环境，使用ts-node
if [ -f "src/cli.ts" ]; then
  node --loader ts-node/esm src/cli.ts "$@"
# 如果是生产环境，使用编译后的代码
elif [ -f "dist/cli.js" ]; then 
  node dist/cli.js "$@"
else
  echo "错误: 找不到CLI入口文件"
  exit 1
fi 