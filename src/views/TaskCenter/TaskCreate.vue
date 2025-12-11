<template>
  <el-steps :active="step" finish-status="success" align-center>
    <el-step title="基本信息" />
    <el-step title="智能调度" />
    <el-step title="确认提交" />
  </el-steps>

  <div style="margin-top: 16px">
    <el-card v-if="step === 0">
      <el-form :model="form" label-width="100px">
        <el-form-item label="起始医院"
          ><el-select v-model="form.origin"
            ><el-option label="市立医院" value="市立医院" /><el-option
              label="中心医院"
              value="中心医院" /></el-select
        ></el-form-item>
        <el-form-item label="目标医院"
          ><el-select v-model="form.target"
            ><el-option label="中心医院" value="中心医院" /><el-option
              label="市立医院"
              value="市立医院" /></el-select
        ></el-form-item>
        <el-form-item label="物资类型"
          ><el-select v-model="form.type"
            ><el-option label="药品" value="药品" /><el-option
              label="血液"
              value="血液" /></el-select
        ></el-form-item>
        <el-form-item label="重量"
          ><el-input-number v-model="form.weight" :min="0.1" :max="20" /> kg</el-form-item
        >
      </el-form>
      <el-button type="primary" @click="next">下一步</el-button>
    </el-card>

    <el-card v-else-if="step === 1">
      <el-button type="primary" :loading="loading" @click="calc">计算航线</el-button>
      <div style="margin-top: 12px" v-if="recommendation">
        <el-result icon="success" title="已生成推荐">
          <template #extra>
            <div>推荐无人机：{{ recommendation.drone }}，预估时间：{{ recommendation.eta }}</div>
          </template>
        </el-result>
      </div>
      <el-button style="margin-top: 12px" :disabled="!recommendation" type="primary" @click="next"
        >下一步</el-button
      >
    </el-card>

    <el-card v-else>
      <el-result icon="success" title="任务可提交" sub-title="请确认信息">
        <template #extra>
          <el-button type="primary" @click="submit">确认提交</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/store/task'
import { ElMessage } from 'element-plus'

const step = ref(0)
const form = ref({ origin: '市立医院', target: '中心医院', type: '药品', weight: 1 })
const task = useTaskStore()
const loading = ref(false)
const recommendation = ref<any>(null)

const next = () => {
  step.value++
}
const calc = async () => {
  loading.value = true
  await task.compute(form.value)
  recommendation.value = task.recommendation
  loading.value = false
}
const submit = () => {
  ElMessage.success('任务已提交')
}
</script>
