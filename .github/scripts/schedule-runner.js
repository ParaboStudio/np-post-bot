/**
 * 调度任务执行器
 * 用于GitHub Actions中执行定时发布任务
 */
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// 导入默认配置
// 注意：由于是在GitHub Actions中运行，我们需要直接访问编译后的JS文件
const defaultConfigPath = path.join(process.cwd(), 'dist', 'config', 'default.js');
let defaultConfig;

try {
  const configModule = require(defaultConfigPath);
  defaultConfig = configModule.default || configModule;
  console.log('成功加载默认配置');
} catch (error) {
  console.error('无法加载默认配置，使用备用选项:', error);
  
  // 确定项目根目录（从脚本位置回溯两级）
  const scriptDir = __dirname;
  const projectRoot = path.resolve(scriptDir, '../..');
  
  // 使用绝对路径创建备用配置
  defaultConfig = {
    DATA_DIR: path.join(projectRoot, 'tmp', 'parabo_v0_0_1'),
    BASE_URL: 'https://sepolia.namepump.com'
  };
}

// 使用来自defaultConfig的配置
const DATA_DIR = defaultConfig.DATA_DIR;
const SCHEDULER_DIR = path.join(DATA_DIR, 'scheduler'); // 专门的调度器子目录
const TASKS_CONFIG_PATH = path.join(SCHEDULER_DIR, 'schedule-tasks.json');
const HISTORY_PATH = path.join(SCHEDULER_DIR, 'schedule-history.json');

// 确保必要的目录存在
async function ensureDirectories() {
  try {
    // 确保数据目录和调度器子目录存在
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(SCHEDULER_DIR, { recursive: true });
    console.log(`已确保目录存在: ${SCHEDULER_DIR}`);
  } catch (error) {
    console.error('创建目录失败:', error);
    throw error;
  }
}

// 加载调度任务
async function loadTasks() {
  try {
    try {
      await fs.access(TASKS_CONFIG_PATH);
    } catch (error) {
      // 文件不存在，创建空的任务列表
      await fs.writeFile(TASKS_CONFIG_PATH, JSON.stringify({ tasks: [] }, null, 2));
      console.log('创建了空的调度任务配置文件');
      return [];
    }
    
    const content = await fs.readFile(TASKS_CONFIG_PATH, 'utf8');
    const data = JSON.parse(content);
    console.log(`加载了 ${data.tasks?.length || 0} 个调度任务`);
    return data.tasks || [];
  } catch (error) {
    console.error('加载调度任务失败:', error);
    return [];
  }
}

// 加载执行历史
async function loadHistory() {
  try {
    try {
      await fs.access(HISTORY_PATH);
    } catch (error) {
      // 文件不存在，创建空的历史记录
      await fs.writeFile(HISTORY_PATH, JSON.stringify({ executions: [] }, null, 2));
      console.log('创建了空的执行历史记录文件');
      return { executions: [] };
    }
    
    const content = await fs.readFile(HISTORY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('加载执行历史失败:', error);
    return { executions: [] };
  }
}

// 保存执行历史
async function saveHistory(history) {
  try {
    await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
    console.log('已保存执行历史');
  } catch (error) {
    console.error('保存执行历史失败:', error);
    throw error;
  }
}

// 检查任务是否已在今天执行过
function isTaskExecutedToday(history, taskId) {
  const today = new Date().toISOString().split('T')[0];
  return history.executions.some(exec => 
    exec.taskId === taskId && 
    exec.executionDate.startsWith(today)
  );
}

// 记录执行历史
function recordExecution(history, taskId, status, details = '') {
  const execution = {
    taskId,
    executionDate: new Date().toISOString(),
    status,
    details
  };
  
  history.executions.push(execution);
  
  // 保留最近100条记录
  if (history.executions.length > 100) {
    history.executions = history.executions.slice(-100);
  }
  
  console.log(`记录了任务 ${taskId} 的执行结果: ${status}`);
  return execution;
}

// 执行任务
async function executeTask(task) {
  console.log(`开始执行任务 ${task.id}: 在 ${task.community} 发布 ${task.contentCount} 条内容，间隔 ${task.interval} 分钟`);
  
  const results = [];
  
  try {
    for (let i = 0; i < task.contentCount; i++) {
      // 如果不是第一次发布且有间隔，等待指定时间
      if (i > 0 && task.interval > 0) {
        const waitTimeMs = Math.min(task.interval * 60 * 1000, 5 * 60 * 1000); // 最多等待5分钟
        console.log(`等待 ${waitTimeMs / 1000} 秒后发布下一条内容...`);
        await new Promise(r => setTimeout(r, waitTimeMs));
      }
      
      // 构建发布命令
      // 注意：这里假设您有一个Node.js脚本可以执行发布操作
      // 如果没有，需要根据实际情况调整
      const publishCommand = `node src/cli.js content publish --community="${task.community}" --contentType="${task.contentType || 'default'}"`;
      
      console.log(`执行命令: ${publishCommand}`);
      
      try {
        // 执行命令
        const output = execSync(publishCommand, { encoding: 'utf8' });
        console.log(`发布结果 #${i+1}:`, output.trim());
        results.push(`✅ 发布 #${i+1}: 成功`);
      } catch (error) {
        console.error(`发布 #${i+1} 失败:`, error);
        results.push(`❌ 发布 #${i+1}: 失败 - ${error.message || '未知错误'}`);
      }
    }
    
    console.log(`任务 ${task.id} 执行完成，结果:`, results);
    return {
      success: results.every(r => r.includes('✅')),
      results
    };
  } catch (error) {
    console.error(`执行任务 ${task.id} 出错:`, error);
    return {
      success: false,
      results: [`❌ 任务执行错误: ${error.message || '未知错误'}`]
    };
  }
}

// 主函数
async function main() {
  try {
    // 确保目录存在
    await ensureDirectories();
    
    // 检查是否是手动运行特定任务
    const manualTaskId = process.env.MANUAL_TASK_ID;
    
    // 加载任务和历史
    const tasks = await loadTasks();
    const history = await loadHistory();
    
    // 如果指定了手动执行的任务ID
    if (manualTaskId) {
      console.log(`手动执行任务 ID: ${manualTaskId}`);
      
      // 查找指定的任务
      const task = tasks.find(t => t.id === manualTaskId);
      if (!task) {
        console.error(`未找到ID为 ${manualTaskId} 的任务`);
        return;
      }
      
      // 执行任务
      const result = await executeTask(task);
      
      // 记录执行历史
      recordExecution(
        history, 
        task.id, 
        result.success ? 'success' : 'failure',
        result.results.join('\n')
      );
      
      // 保存历史
      await saveHistory(history);
      
      return;
    }
    
    // 检查当前时间窗口内的任务
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`当前时间: ${now.toISOString()} (${currentHour}:${currentMinute})`);
    console.log(`检查 ${tasks.length} 个任务中是否有需要执行的...`);
    
    let executedCount = 0;
    
    // 检查每个任务
    for (const task of tasks) {
      // 跳过禁用的任务
      if (!task.enabled) {
        console.log(`跳过禁用的任务: ${task.id}`);
        continue;
      }
      
      // 解析任务时间
      const [hour, minute] = task.time.split(':').map(Number);
      
      // 检查是否在当前时间窗口内(5分钟内)
      const isTimeMatch = (
        hour === currentHour && 
        Math.abs(minute - currentMinute) <= 5
      );
      
      if (isTimeMatch) {
        console.log(`找到匹配当前时间窗口的任务: ${task.id} (${task.time})`);
        
        // 检查今天是否已执行过
        if (isTaskExecutedToday(history, task.id)) {
          console.log(`任务 ${task.id} 今天已执行过，跳过`);
          continue;
        }
        
        // 执行任务
        const result = await executeTask(task);
        
        // 记录执行结果
        recordExecution(
          history, 
          task.id, 
          result.success ? 'success' : 'failure',
          result.results.join('\n')
        );
        
        // 计数
        executedCount++;
      }
    }
    
    // 保存历史记录
    await saveHistory(history);
    
    console.log(`任务检查完成，执行了 ${executedCount} 个任务`);
    
  } catch (error) {
    console.error('执行调度脚本时出错:', error);
  }
}

// 执行主函数
main().catch(console.error);