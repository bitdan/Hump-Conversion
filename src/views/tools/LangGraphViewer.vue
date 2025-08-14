<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-6xl bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          LangGraph 回答查看器
        </h1>
        <p class="text-gray-600 mt-2">展示和分析 LangGraph 生成的回答内容</p>
        
        <!-- 操作按钮 -->
        <div class="flex gap-4 justify-center mt-6">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showInputDialog = true"
          >
            输入新数据
          </v-btn>
          <v-btn
            color="success"
            prepend-icon="mdi-api"
            @click="showApiDialog = true"
            :loading="apiLoading"
          >
            从API获取
          </v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                color="secondary"
                prepend-icon="mdi-database"
                v-bind="props"
              >
                预设示例
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="example in presetExamples"
                :key="example.name"
                @click="loadExample(example.data)"
              >
                <v-list-item-title>{{ example.name }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>

      <!-- 主题展示 -->
      <div class="bg-white/80 rounded-xl p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <v-icon color="primary" size="large">mdi-book-open-variant</v-icon>
          <h2 class="text-2xl font-semibold text-gray-800">主题</h2>
        </div>
        <v-chip
          :color="getTopicColor"
          class="text-lg font-medium px-4 py-2"
          size="large"
        >
          {{ langGraphData.topic }}
        </v-chip>
      </div>

      <!-- 草稿内容 -->
      <div class="bg-white/80 rounded-xl p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <v-icon color="success" size="large">mdi-file-document-edit</v-icon>
          <h2 class="text-2xl font-semibold text-gray-800">草稿内容</h2>
          <v-chip color="info" class="ml-auto">
            尝试次数: {{ langGraphData.attempts }}
          </v-chip>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div class="prose prose-lg max-w-none">
            <div v-html="formatDraftContent"></div>
          </div>
        </div>
        
        <div class="flex gap-2 mt-4">
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-content-copy"
            @click="copyToClipboard(langGraphData.draft)"
          >
            复制草稿
          </v-btn>
          <v-btn
            color="secondary"
            variant="outlined"
            prepend-icon="mdi-download"
            @click="downloadDraft"
          >
            下载草稿
          </v-btn>
        </div>
      </div>

      <!-- 修正建议 -->
      <div class="bg-white/80 rounded-xl p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <v-icon color="warning" size="large">mdi-lightbulb-on</v-icon>
          <h2 class="text-2xl font-semibold text-gray-800">修正建议</h2>
          <v-chip color="warning" class="ml-auto">
            {{ langGraphData.corrections.length }} 条建议
          </v-chip>
        </div>

        <v-expansion-panels variant="accordion">
          <v-expansion-panel
            v-for="(correction, index) in langGraphData.corrections"
            :key="index"
            class="mb-2"
          >
            <v-expansion-panel-title class="text-lg font-medium">
              <div class="flex items-center gap-2">
                <v-icon color="warning">mdi-alert-circle</v-icon>
                建议 {{ index + 1 }}
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="bg-yellow-50 rounded-lg p-4">
                <div class="prose prose-lg max-w-none" v-html="formatCorrectionContent(correction)"></div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- 统计信息 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <v-card class="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <v-card-text class="text-center">
            <div class="text-3xl font-bold">{{ langGraphData.attempts }}</div>
            <div class="text-sm opacity-90">尝试次数</div>
          </v-card-text>
        </v-card>
        
        <v-card class="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <v-card-text class="text-center">
            <div class="text-3xl font-bold">{{ langGraphData.corrections.length }}</div>
            <div class="text-sm opacity-90">修正建议</div>
          </v-card-text>
        </v-card>
        
        <v-card class="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <v-card-text class="text-center">
            <div class="text-3xl font-bold">{{ draftWordCount }}</div>
            <div class="text-sm opacity-90">草稿字数</div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- 输入对话框 -->
    <v-dialog v-model="showInputDialog" max-width="800px">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon class="mr-2">mdi-plus</v-icon>
          输入 LangGraph 数据
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="inputJson"
            label="请输入 JSON 格式的 LangGraph 数据"
            variant="outlined"
            rows="15"
            placeholder='{
  "topic": "主题",
  "draft": "草稿内容",
  "corrections": ["修正建议1", "修正建议2"],
  "attempts": 3
}'
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showInputDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            @click="loadJsonData"
            :disabled="!inputJson.trim()"
          >
            加载数据
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- API对话框 -->
    <v-dialog v-model="showApiDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon class="mr-2">mdi-api</v-icon>
          从API获取数据
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">
              API地址: <code class="bg-gray-100 px-2 py-1 rounded">http://0.0.0.0:8000/api/v1/chat</code>
            </p>
          </div>
          <v-text-field
            v-model="apiTopic"
            label="请输入主题"
            variant="outlined"
            placeholder="例如: cglib对比jdk代理"
            :disabled="apiLoading"
          />
          <div class="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 class="font-medium text-blue-800 mb-2">请求格式:</h4>
            <pre class="text-sm text-blue-700 bg-blue-100 p-3 rounded overflow-x-auto">{
  "topic": "{{ apiTopic || '主题' }}"
}</pre>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showApiDialog = false"
            :disabled="apiLoading"
          >
            取消
          </v-btn>
          <v-btn
            color="success"
            @click="fetchFromApi"
            :loading="apiLoading"
            :disabled="!apiTopic.trim()"
          >
            获取数据
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMessage } from '../../composables/useMessage';

// 定义 LangGraph 数据结构
interface LangGraphData {
  topic: string;
  draft: string;
  corrections: string[];
  attempts: number;
}

// 示例数据
const langGraphData = ref<LangGraphData>({
  topic: "cglib对比jdk代理",
  draft: `CGLIB（Code Generation Library）和JDK动态代理是Java中两种常用的代理技术，广泛应用于各类项目中。自Java 1.3引入的JDK动态代理依赖于接口，通过反射机制在运行时创建代理对象。其优点在于简单易用，但由于仅支持基于接口的代理，这限制了其应用场景。例如，在一个需要对用户服务进行权限控制的项目中，开发者可以通过实现一个用户服务接口，并利用JDK动态代理为该接口添加安全检查。以下是一个简单的代码示例：

\`\`\`java
public interface UserService {
    void login(String username, String password);
}

public class UserServiceImpl implements UserService {
    public void login(String username, String password) {
        // 登录逻辑
    }
}

// JDK动态代理实现
UserService userService = (UserService) Proxy.newProxyInstance(
        UserService.class.getClassLoader(),
        new Class<?>[]{UserService.class},
        (proxy, method, args) -> {
            // 添加权限检查逻辑
            return method.invoke(new UserServiceImpl(), args);
        }
);
\`\`\`

相比之下，CGLIB是在JDK动态代理之后出现的，主要用于解决其局限性。CGLIB通过字节码生成技术，可以在运行时为目标类生成子类，并通过重写方法实现代理。这使得CGLIB能够代理没有实现任何接口的类，适用性更广。例如，在一个复杂的订单处理系统中，CGLIB可以对业务逻辑类进行代理，以实现日志记录和性能监控。以下是CGLIB的使用示例：

\`\`\`java
public class OrderService {
    public void processOrder() {
        // 订单处理逻辑
    }
}

// CGLIB代理实现
Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(OrderService.class);
enhancer.setCallback((MethodInterceptor) (obj, method, args) -> {
    // 添加日志记录逻辑
    return method.invoke(new OrderService(), args);
});
OrderService proxyOrderService = (OrderService) enhancer.create();
\`\`\`

在性能方面，CGLIB和JDK动态代理的差异也值得关注。JDK动态代理的内存占用较小，创建时间也相对较快，适合用于简单的服务层接口代理。而CGLIB在创建代理对象时，由于需要生成字节码，可能会占用更多的内存，并且创建时间较长，但在执行效率上往往表现更佳，尤其是在需要频繁调用的情况下。

在现代应用中，CGLIB和JDK动态代理各有千秋。CGLIB在需要频繁创建代理对象且目标类没有接口时表现优异，如Spring框架中的AOP（面向切面编程）实现；而JDK动态代理由于其简洁性和内存占用小，常用于简单的服务层接口代理。

然而，这两种技术在实际使用中也存在一些潜在的缺陷。CGLIB无法代理final方法，而JDK动态代理则无法代理没有接口的类。因此，在选择代理方式时，开发者需要考虑具体应用场景和性能需求。以下是一个简单的选择策略表，帮助开发者快速判断：

| 代理类型     | 适用场景                             | 缺陷                       |
|--------------|--------------------------------------|----------------------------|
| JDK动态代理  | 需要基于接口的简单服务层代理       | 无法代理没有接口的类      |
| CGLIB        | 需要频繁创建代理对象且目标类无接口 | 无法代理final方法          |

通过评估内存占用、执行效率和易用性等因素，开发者可以做出更明智的决策。`,
  corrections: [
    `该文本对CGLIB和JDK动态代理进行了较为详细的介绍，但仍有一些可以改进的地方，以增强其清晰度、逻辑性和实用性。以下是两项具体的改进建议：

### 1. 增强理论与实践的结合

**问题**：虽然文本提供了JDK动态代理和CGLIB的基本概念和示例，但对于如何在实际项目中选择和应用这两种技术的指导不足。

**改进建议**：可以增加一些实际应用场景的案例分析，尤其是在选择代理技术时的决策过程。例如，可以介绍在某些特定情况下（如性能瓶颈、复杂性、团队技术栈等）选择CGLIB或JDK动态代理的理由。同时，可以在文本末尾增加一段关于如何在项目中进行性能测试和评估的建议，以帮助开发者在实际应用中做出更明智的决定。

### 2. 细化表格内容与结构

**问题**：选择策略表虽然提供了一些基本信息，但信息量较少，且未能充分反映出两者的优缺点。

**改进建议**：可以扩展选择策略表，增加更多的列，例如"性能考虑"、"易用性"、"适用框架"等，以便开发者获得更全面的信息。此外，还可以提供一些示例代码或实际使用情况，以帮助开发者更好地理解每种代理类型的适用场景和潜在问题。例如：

| 代理类型     | 适用场景                             | 优点                       | 缺陷                       | 性能考虑         | 易用性         |
|--------------|--------------------------------------|----------------------------|----------------------------|-------------------|----------------|
| JDK动态代理  | 需要基于接口的简单服务层代理       | 简单易用，内存占用小      | 无法代理没有接口的类      | 创建快，执行略慢 | 高             |
| CGLIB        | 需要频繁创建代理对象且目标类无接口 | 支持没有接口的类，执行效率高 | 无法代理final方法          | 创建慢，内存占用高 | 中等           |

通过这样的改进，文本将更具实用性和参考价值，帮助读者更好地理解和应用这两种代理技术。`
  ],
  attempts: 3
});

// 添加输入功能
const showInputDialog = ref(false);
const inputJson = ref('');

// API相关状态
const showApiDialog = ref(false);
const apiLoading = ref(false);
const apiTopic = ref('');

// 预设示例数据
const presetExamples = [
  {
    name: 'CGLIB vs JDK代理',
    data: {
      topic: "cglib对比jdk代理",
      draft: "CGLIB和JDK动态代理的详细对比分析...",
      corrections: ["建议1", "建议2"],
      attempts: 3
    }
  },
  {
    name: 'Vue3 组合式API',
    data: {
      topic: "Vue3 Composition API 最佳实践",
      draft: "Vue3组合式API的使用指南和最佳实践...",
      corrections: ["性能优化建议", "代码组织建议"],
      attempts: 2
    }
  }
];

const { showSuccess, showError } = useMessage();

// 计算属性
const getTopicColor = computed(() => {
  const topic = langGraphData.value.topic.toLowerCase();
  if (topic.includes('java') || topic.includes('cglib') || topic.includes('jdk')) {
    return 'orange';
  } else if (topic.includes('对比') || topic.includes('比较')) {
    return 'blue';
  } else {
    return 'primary';
  }
});

const formatDraftContent = computed(() => {
  return langGraphData.value.draft
    .replace(/\n/g, '<br>')
    .replace(/```(\w+)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto"><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\|(.*?)\|/g, (match) => {
      const cells = match.split('|').filter(cell => cell.trim());
      if (cells.length > 1) {
        return `<table class="border-collapse border border-gray-300 w-full my-4"><tr>${cells.map(cell => `<td class="border border-gray-300 px-3 py-2">${cell.trim()}</td>`).join('')}</tr></table>`;
      }
      return match;
    });
});

const draftWordCount = computed(() => {
  return langGraphData.value.draft.replace(/\s+/g, '').length;
});

// 方法
function formatCorrectionContent(correction: string): string {
  return correction
    .replace(/\n/g, '<br>')
    .replace(/### (.*?)\n/g, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```(\w+)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto"><code>$2</code></pre>')
    .replace(/\|(.*?)\|/g, (match) => {
      const cells = match.split('|').filter(cell => cell.trim());
      if (cells.length > 1) {
        return `<table class="border-collapse border border-gray-300 w-full my-4"><tr>${cells.map(cell => `<td class="border border-gray-300 px-3 py-2">${cell.trim()}</td>`).join('')}</tr></table>`;
      }
      return match;
    });
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    showSuccess('内容已复制到剪贴板');
  }).catch(() => {
    showError('复制失败');
  });
}

function downloadDraft(): void {
  const blob = new Blob([langGraphData.value.draft], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${langGraphData.value.topic}_draft.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showSuccess('草稿已下载');
}

function loadExample(data: LangGraphData): void {
  langGraphData.value = data;
  showSuccess('示例数据已加载');
}

function loadJsonData(): void {
  try {
    const data = JSON.parse(inputJson.value);
    if (data.topic && data.draft && Array.isArray(data.corrections) && typeof data.attempts === 'number') {
      langGraphData.value = data;
      showInputDialog.value = false;
      inputJson.value = '';
      showSuccess('数据加载成功');
    } else {
      showError('JSON 格式不正确，请检查数据结构');
    }
  } catch (error) {
    showError('JSON 解析失败，请检查格式');
  }
}

async function fetchFromApi(): Promise<void> {
  if (!apiTopic.value.trim()) {
    showError('请输入主题');
    return;
  }

  apiLoading.value = true;
  try {
    const response = await fetch('http://0.0.0.0:8000/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: apiTopic.value
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // 假设API返回的数据结构与LangGraphData兼容
    if (data.topic && data.draft && Array.isArray(data.corrections) && typeof data.attempts === 'number') {
      langGraphData.value = data;
      showApiDialog.value = false;
      apiTopic.value = '';
      showSuccess('从API获取数据成功');
    } else {
      showError('API返回的数据格式不正确');
    }
  } catch (error) {
    console.error('API调用失败:', error);
    showError('API调用失败，请检查网络连接和接口地址');
  } finally {
    apiLoading.value = false;
  }
}
</script>

<style scoped>
.prose {
  line-height: 1.6;
}

.prose pre {
  margin: 1rem 0;
}

.prose table {
  margin: 1rem 0;
}

.prose strong {
  font-weight: 600;
  color: #1f2937;
}

.prose em {
  font-style: italic;
  color: #4b5563;
}
</style>
