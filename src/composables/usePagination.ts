import {computed, ref} from 'vue'

export function usePagination(pageSizeOverride = 10) {
  const page = ref(1)
  const pageSize = ref(pageSizeOverride)
  const total = ref(0)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  function reset() {
    page.value = 1
  }

  return {
    page,
    pageSize,
    total,
    pageCount,
    reset
  }
}
