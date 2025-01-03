<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-4xl bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          数据加密工具
        </h1>
      </div>

      <!-- 算法选择区域 -->
      <div class="bg-white/80 rounded-xl p-6 mb-6">
        <v-tabs v-model="selectedType" class="mb-4" density="comfortable">
          <v-tab v-for="type in encryptionTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </v-tab>
        </v-tabs>

        <v-select
          v-model="selectedAlgorithm"
          :items="algorithms[selectedType]"
          label="选择具体算法"
          variant="outlined"
          density="comfortable"
          class="bg-white rounded-lg"
        />
      </div>

      <!-- 输入输出区域 -->
      <div class="grid gap-6">
        <v-textarea
          v-model="inputText"
          :label="getInputPlaceholder"
          variant="outlined"
          class="bg-white/80 rounded-xl"
          rows="4"
        />

        <v-text-field
          v-if="needsKey"
          v-model="key"
          :label="getKeyPlaceholder"
          variant="outlined"
          class="bg-white/80 rounded-xl"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
        />

        <!-- 操作按钮 -->
        <div class="flex gap-4">
          <v-btn
            color="primary"
            @click="processText"
            :loading="processing"
            prepend-icon="mdi-lock"
            class="flex-1"
          >
            {{ getButtonText }}
          </v-btn>
          
          <v-btn
            v-if="canDecrypt"
            color="secondary"
            @click="decrypt"
            :loading="processing"
            prepend-icon="mdi-lock-open"
            class="flex-1"
          >
            解密
          </v-btn>
        </div>

        <!-- 结果区域 -->
        <v-textarea
          v-model="result"
          label="结果"
          variant="outlined"
          class="bg-white/80 rounded-xl"
          rows="4"
          readonly
          @click="copyText(result)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { HashFunctions, SymmetricEncryption, AsymmetricEncryption, PasswordHashing, Base64, SMCrypto } from '../../utils/crypto';

// 基础状态
const selectedType = ref('hash');
const selectedAlgorithm = ref('MD5');
const inputText = ref('');
const key = ref('');
const result = ref('');

// UI 状态
const showPassword = ref(false);
const showCopyTip = ref(false);
const processing = ref(false);

// 加密类型和算法配置
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

// 计算属性
const needsKey = computed(() => ['symmetric', 'asymmetric'].includes(selectedType.value));
const canDecrypt = computed(() => ['symmetric', 'asymmetric', 'base64'].includes(selectedType.value));

const getButtonText = computed(() => {
  if (selectedType.value === 'hash' || selectedType.value === 'password') {
    return '计算哈希';
  }
  return '加密';
});

const getInputPlaceholder = computed(() => {
  switch (selectedType.value) {
    case 'hash': return '输入要计算哈希的文本';
    case 'password': return '输入要哈希的密码';
    case 'base64': return '输入要编码/解码的文本';
    default: return '输入要加密的文本';
  }
});

const getKeyPlaceholder = computed(() => {
  switch (selectedType.value) {
    case 'symmetric': return '输入加密密钥';
    case 'asymmetric':
      if (selectedAlgorithm.value === 'RSA') {
        return '输入公钥(加密)/私钥(解密)';
      }
      return '输入密钥';
    default: return '输入密钥';
  }
});

// 复制功能
async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showCopyTip.value = true;
  } catch (err) {
    console.error('复制失败:', err);
  }
}

// 处理加密/解密
async function processText() {
  if (!inputText.value) {
    result.value = '请输入要处理的文本';
    return;
  }
  
  processing.value = true;
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
  } finally {
    processing.value = false;
  }
}

async function decrypt() {
  if (!inputText.value) {
    result.value = '请输入要解密的文本';
    return;
  }

  processing.value = true;
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
  } finally {
    processing.value = false;
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

// 添加 watch 来监听 selectedType 的变化
watch(selectedType, (newType) => {
  // 当类型改变时，将算法设置为该类型下的第一个选项
  if (algorithms[newType] && algorithms[newType].length > 0) {
    selectedAlgorithm.value = algorithms[newType][0];
  }
});
</script>

<style scoped>
.transition-opacity {
  transition: opacity 0.3s ease-in-out;
}
</style> 