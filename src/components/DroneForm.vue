<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Drone } from '../types'
const props = defineProps<{ modelValue: boolean; editData?: Drone | null }>()
const emit = defineEmits(['update:modelValue', 'submit'])

const form = reactive({ id: '', model: '', battery: 100, status: 'idle', lastLocation: '' })

watch(
  () => props.editData,
  (v) => {
    if (v) Object.assign(form, v)
    else {
      form.id = ''
      form.model = ''
      form.battery = 100
      form.status = 'idle'
      form.lastLocation = ''
    }
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  emit('submit', { ...form })
}
</script>

<template>
  <el-dialog :model-value="props.modelValue" title="无人机" @close="close">
    <el-form label-width="100px">
      <el-form-item label="编号">
        <el-input v-model="form.id" :disabled="!!form.id" />
      </el-form-item>
      <el-form-item label="型号">
        <el-input v-model="form.model" />
      </el-form-item>
      <el-form-item label="电量">
        <el-input-number v-model="form.battery" :min="0" :max="100" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status">
          <el-option label="空闲" value="idle" />
          <el-option label="飞行中" value="flying" />
          <el-option label="维护" value="maintenance" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
