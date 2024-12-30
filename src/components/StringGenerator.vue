<template>
  <div class="flex flex-col items-center p-6">
    <h1 class="text-2xl font-bold mb-4">字符串生成器</h1>

    <div class="mb-4">
      <label for="length" class="block text-lg mb-2">字符串长度:</label>
      <input
          type="number"
          v-model="length"
          id="length"
          min="1"
          class="p-2 border border-gray-300 rounded"
      />
    </div>

    <div class="mb-4 space-y-2">
      <div>
        <input type="checkbox" v-model="includeNumbers" id="numbers" class="mr-2"/>
        <label for="numbers">数字（0-9）</label>
      </div>
      <div>
        <input type="checkbox" v-model="includeLowercase" id="lowercase" class="mr-2"/>
        <label for="lowercase">小写字母（a-z）</label>
      </div>
      <div>
        <input type="checkbox" v-model="includeUppercase" id="uppercase" class="mr-2"/>
        <label for="uppercase">大写字母（A-Z）</label>
      </div>
      <div>
        <input type="checkbox" v-model="includeSpecial" id="special" class="mr-2"/>
        <label for="special">特别字符（！@＃$％^＆* -_ = +）</label>
      </div>
    </div>

    <button @click="generateString" class="bg-blue-500 text-white px-4 py-2 rounded mt-4 hover:bg-blue-600">生成字符串</button>

    <div v-if="generatedString" class="mt-4 text-xl">
      <p>生成的字符串: <strong>{{ generatedString }}</strong></p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      length: 10,
      generatedString: '',
      includeNumbers: true,
      includeLowercase: true,
      includeUppercase: true,
      includeSpecial: true,
    };
  },
  methods: {
    generateString() {
      let characters = '';
      if (this.includeNumbers) characters += '0123456789';
      if (this.includeLowercase) characters += 'abcdefghijklmnopqrstuvwxyz';
      if (this.includeUppercase) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (this.includeSpecial) characters += '！@＃$％^＆*-_+=';

      if (!characters) {
        alert('请选择至少一个字符集');
        return;
      }

      let result = '';
      for (let i = 0; i < this.length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
      }
      this.generatedString = result;
    },
  },
};
</script>
