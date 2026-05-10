import {nextTick, type Ref} from 'vue'

function resolveInputElement(target: any): HTMLInputElement | HTMLTextAreaElement | null {
    const root = target?.$el || target
    if (!root || typeof root.querySelector !== 'function') {
        return null
    }
    return root.querySelector('textarea, input')
}

export async function insertTextAtCursor(
    model: Ref<string>,
    targetRef: Ref<any>,
    insertedText: string
) {
    const element = resolveInputElement(targetRef.value)
    const currentValue = String(model.value || '')

    if (!element) {
        model.value = `${currentValue}${insertedText}`
        return
    }

    const start = typeof element.selectionStart === 'number' ? element.selectionStart : currentValue.length
    const end = typeof element.selectionEnd === 'number' ? element.selectionEnd : start
    model.value = `${currentValue.slice(0, start)}${insertedText}${currentValue.slice(end)}`

    await nextTick()

    const updatedElement = resolveInputElement(targetRef.value)
    if (!updatedElement) {
        return
    }
    const cursor = start + insertedText.length
    updatedElement.focus()
    if (typeof updatedElement.setSelectionRange === 'function') {
        updatedElement.setSelectionRange(cursor, cursor)
    }
}
