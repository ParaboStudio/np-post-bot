@echo off
REM CLI快捷脚本

REM 切换到脚本所在目录
cd %~dp0

REM 如果是开发环境，使用ts-node
if exist src\cli.ts (
  node --loader ts-node/esm src/cli.ts %*
REM 如果是生产环境，使用编译后的代码
) else if exist dist\cli.js (
  node dist\cli.js %*
) else (
  echo 错误: 找不到CLI入口文件
  exit /b 1
) 