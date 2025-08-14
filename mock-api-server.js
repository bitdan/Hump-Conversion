const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

// 模拟LangGraph API响应
app.post('/api/v1/chat', (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: '主题不能为空' });
  }

  // 模拟处理延迟
  setTimeout(() => {
    const mockResponse = {
      topic: topic,
      draft: `这是关于"${topic}"的详细分析内容。\n\n## 概述\n\n${topic}是一个重要的技术概念，在软件开发中有着广泛的应用。\n\n## 主要特点\n\n- 特点1：功能强大\n- 特点2：易于使用\n- 特点3：性能优秀\n\n## 代码示例\n\n\`\`\`javascript\n// 示例代码\nconsole.log("Hello, ${topic}!");\n\`\`\`\n\n## 总结\n\n${topic}是一个值得深入学习和掌握的技术。`,
      corrections: [
        `关于"${topic}"的分析可以进一步改进：\n\n### 1. 增加实际应用场景\n\n**问题**：当前内容缺乏具体的实际应用案例。\n\n**改进建议**：可以添加更多真实世界的应用场景，帮助读者更好地理解${topic}的实际价值。`,
        `### 2. 性能对比分析\n\n**问题**：缺少与其他类似技术的性能对比。\n\n**改进建议**：建议添加性能基准测试数据，让读者能够更客观地评估${topic}的优势和劣势。`
      ],
      attempts: Math.floor(Math.random() * 3) + 1
    };

    res.json(mockResponse);
  }, 1000); // 1秒延迟模拟处理时间
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LangGraph Mock API is running' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Mock API server running at http://0.0.0.0:${port}`);
  console.log(`API endpoint: http://0.0.0.0:${port}/api/v1/chat`);
});
