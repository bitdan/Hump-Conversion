<template>
  <div class="container mx-auto p-4">
    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4">加密工具</h2>
      
      <!-- 算法类型选择 (Tab) -->
      <div class="mb-6">
        <div class="flex border-b border-gray-200">
          <button
            v-for="type in encryptionTypes"
            :key="type.value"
            @click="selectedType = type.value"
            class="px-6 py-2.5 font-medium text-sm leading-5 rounded-t-lg -mb-px"
            :class="[
              selectedType === type.value
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'focus:outline-none focus:text-blue-800 focus:border-blue-700'
            ]"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <!-- 具体算法选择 -->
      <div class="mb-4">
        <label class="block text-gray-700 mb-2">选择具体算法</label>
        <select v-model="selectedAlgorithm" class="w-full p-2 border rounded">
          <option v-for="algo in algorithms[selectedType]" :key="algo" :value="algo">
            {{ algo }}
          </option>
        </select>
      </div>

      <!-- 输入区域 -->
      <div class="mb-4">
        <label class="block text-gray-700 mb-2">输入文本</label>
        <textarea
          v-model="inputText"
          class="w-full p-2 border rounded"
          rows="4"
          :placeholder="getInputPlaceholder"
        ></textarea>
      </div>

      <!-- 密钥输入 (对称/非对称加密) -->
      <div v-if="needsKey" class="mb-4">
        <label class="block text-gray-700 mb-2">密钥</label>
        <input
          v-model="key"
          type="text"
          class="w-full p-2 border rounded"
          :placeholder="getKeyPlaceholder"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2 mb-4">
        <button
          @click="processText"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          {{ getButtonText }}
        </button>
        <button
          v-if="canDecrypt"
          @click="decrypt"
          class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          解密
        </button>
      </div>

      <!-- 输出结果 -->
      <div class="mb-4">
        <label class="block text-gray-700 mb-2">结果</label>
        <textarea
          v-model="result"
          class="w-full p-2 border rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
          rows="4"
          readonly
          @click="copyText(result)"
        ></textarea>
      </div>

      <!-- 复制成功提示 -->
      <div
        v-if="showCopyTip"
        class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-300"
        :class="{ 'opacity-0': copyTipFading }"
      >
        已复制到剪贴板
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { HashFunctions, SymmetricEncryption, AsymmetricEncryption, PasswordHashing, Base64, SMCrypto } from '../utils/crypto';

const selectedType = ref('hash');
const selectedAlgorithm = ref('MD5');
const inputText = ref('');
const key = ref('');
const result = ref('');

const encryptionTypes = [
  { label: '哈希函数', value: 'hash' },
  { label: '对称加密', value: 'symmetric' },
  { label: '非对称加密', value: 'asymmetric' },
  { label: '密码哈希', value: 'password' },
  { label: 'Base64', value: 'base64' },
];

const algorithms = {
  hash: ['MD5', 'SHA-256', 'SHA-512', 'SHA3', 'SM3', 'RIPEMD160'],
  symmetric: ['AES', 'DES', 'Triple DES', 'SM4'],
  asymmetric: ['RSA', 'SM2'],
  password: ['Bcrypt'],
  base64: ['Base64'],
};

const needsKey = computed(() => {
  return ['symmetric', 'asymmetric'].includes(selectedType.value);
});

const canDecrypt = computed(() => {
  return ['symmetric', 'asymmetric', 'base64'].includes(selectedType.value);
});

const getButtonText = computed(() => {
  if (selectedType.value === 'hash' || selectedType.value === 'password') {
    return '计算哈希';
  }
  return '加密';
});

const getInputPlaceholder = computed(() => {
  switch (selectedType.value) {
    case 'hash':
      return '输入要计算哈希的文本';
    case 'password':
      return '输入要哈希的密码';
    case 'base64':
      return '输入要编码/解码的文本';
    default:
      return '输入要加密的文本';
  }
});

const getKeyPlaceholder = computed(() => {
  switch (selectedType.value) {
    case 'symmetric':
      return '输入加密密钥';
    case 'asymmetric':
      if (selectedAlgorithm.value === 'RSA') {
        return '输入公钥(加密)/私钥(解密)';
      } else if (selectedAlgorithm.value === 'SM9') {
        return '输入主公钥(加密)/用户私钥(解密)';
      } else {
        return '输入密钥';
      }
    default:
      return '输入密钥';
  }
});

// 添加复制提示相关的状态
const showCopyTip = ref(false);
const copyTipFading = ref(false);
let copyTipTimer: number | null = null;

// 监听结果变化，自动复制
watch(result, (newValue) => {
  if (newValue) {
    copyText(newValue);
  }
});

// 复制函数
async function copyText(text: string) {
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    
    // 清除之前的定时器
    if (copyTipTimer) {
      clearTimeout(copyTipTimer);
      showCopyTip.value = false;
      copyTipFading.value = false;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 显示提示
    showCopyTip.value = true;
    copyTipFading.value = false;

    // 设置定时器淡出提示
    copyTipTimer = window.setTimeout(() => {
      copyTipFading.value = true;
      setTimeout(() => {
        showCopyTip.value = false;
        copyTipFading.value = false;
      }, 300);
    }, 1500);
  } catch (err) {
    console.error('复制失败:', err);
  }
}

async function processText() {
  try {
    switch (selectedType.value) {
      case 'hash':
        processHash();
        break;
      case 'symmetric':
        processSymmetric(true);
        break;
      case 'asymmetric':
        processAsymmetric(true);
        break;
      case 'password':
        await processPassword();
        break;
      case 'base64':
        processBase64(true);
        break;
    }
  } catch (error) {
    result.value = `错误: ${error.message}`;
  }
}

async function decrypt() {
  try {
    switch (selectedType.value) {
      case 'symmetric':
        processSymmetric(false);
        break;
      case 'asymmetric':
        processAsymmetric(false);
        break;
      case 'base64':
        processBase64(false);
        break;
    }
  } catch (error) {
    result.value = `解密错误: ${error.message}`;
  }
}

function processHash() {
  switch (selectedAlgorithm.value) {
    case 'MD5':
      result.value = HashFunctions.md5(inputText.value);
      break;
    case 'SHA-256':
      result.value = HashFunctions.sha256(inputText.value);
      break;
    case 'SHA-512':
      result.value = HashFunctions.sha512(inputText.value);
      break;
    case 'SHA3':
      result.value = HashFunctions.sha3(inputText.value);
      break;
    case 'SM3':
      result.value = SMCrypto.sm3(inputText.value);
      break;
    case 'RIPEMD160':
      result.value = HashFunctions.ripemd160(inputText.value);
      break;
  }
}

function processSymmetric(encrypt: boolean) {
  if (!key.value) {
    throw new Error('请输入密钥');
  }

  switch (selectedAlgorithm.value) {
    case 'AES':
      result.value = encrypt
        ? SymmetricEncryption.aesEncrypt(inputText.value, key.value)
        : SymmetricEncryption.aesDecrypt(inputText.value, key.value);
      break;
    case 'DES':
      result.value = encrypt
        ? SymmetricEncryption.desEncrypt(inputText.value, key.value)
        : SymmetricEncryption.desDecrypt(inputText.value, key.value);
      break;
    case 'Triple DES':
      result.value = encrypt
        ? SymmetricEncryption.tripleDesEncrypt(inputText.value, key.value)
        : SymmetricEncryption.tripleDesDecrypt(inputText.value, key.value);
      break;
    case 'SM4':
      result.value = encrypt
        ? SMCrypto.sm4Encrypt(inputText.value, key.value)
        : SMCrypto.sm4Decrypt(inputText.value, key.value);
      break;
  }
}

function processAsymmetric(encrypt: boolean) {
  if (!key.value) {
    throw new Error('请输入密钥');
  }

  switch (selectedAlgorithm.value) {
    case 'RSA':
      result.value = encrypt
        ? AsymmetricEncryption.rsaEncrypt(inputText.value, key.value)
        : AsymmetricEncryption.rsaDecrypt(inputText.value, key.value);
      break;
    case 'SM2':
      result.value = encrypt
        ? SMCrypto.sm2Encrypt(inputText.value, key.value)
        : SMCrypto.sm2Decrypt(inputText.value, key.value);
      break;
    case 'SM9':
      // SM9 需要额外的用户ID输入
      const userId = prompt('请输入用户ID');
      if (!userId) {
        throw new Error('需要用户ID');
      }
      result.value = encrypt
        ? SMCrypto.sm9Encrypt(inputText.value, userId, key.value)
        : SMCrypto.sm9Decrypt(inputText.value, key.value);
      break;
  }
}

async function processPassword() {
  if (selectedAlgorithm.value === 'Bcrypt') {
    result.value = await PasswordHashing.bcryptHash(inputText.value);
  }
}

function processBase64(encode: boolean) {
  result.value = encode
    ? Base64.encode(inputText.value)
    : Base64.decode(inputText.value);
}
</script>

<style scoped>
.tab-active {
  @apply border-b-2 border-blue-500 text-blue-600;
}

.transition-opacity {
  transition: opacity 0.3s ease-in-out;
}

.opacity-0 {
  opacity: 0;
}
</style> 