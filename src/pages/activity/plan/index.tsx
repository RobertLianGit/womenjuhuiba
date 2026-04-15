import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import { useState } from 'react'
import { useRouter, useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import { useUser } from '../../../hooks/useUser'
import './index.scss'

export default () => {
  const router = useRouter()
  const { user } = useUser()
  const [activityId, setActivityId] = useState('')
  const [activity, setActivity] = useState<any>(null)
  const [planContent, setPlanContent] = useState('')
  const [scenes, setScenes] = useState<string[]>([])
  const [newScene, setNewScene] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useDidShow(() => {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as any
    const { id } = current.options || {}
    if (id) {
      setActivityId(id)
      loadActivity(id)
    }
  })

  const loadActivity = async (id: string) => {
    setLoading(true)
    const res = await request<any>(API.activity, { action: 'get', id })
    if (res.success && res.data) {
      setActivity(res.data)
      setPlanContent(res.data.plan_content || '')
      setScenes(res.data.scenes || [])
    }
    setLoading(false)
  }

  const generatePrompt = () => {
    if (!activity) return ''
    const wantsText = '' // 从意愿汇总获取
    return `【角色】你是一位资深活动策划专家。

【背景】我正在组织一场朋友聚会活动，需要你帮我生成一份详细的活动方案。

【基础信息】
- 活动名称：${activity.title}
- 活动描述：${activity.description || '无'}

【你的任务】请生成一份完整的活动方案，包含：
1. 分段建议（几段、每段名称和时间）
2. 时间安排（整体时间线）
3. 地点推荐（2-3 个，含地址、人均消费）
4. 活动流程（详细时间轴）
5. 费用预算参考
6. 注意事项

请用清晰的结构输出，语言轻松活泼。`
  }

  const copyPrompt = () => {
    navigator.clipboard?.writeText(generatePrompt())
  }

  const addScene = () => {
    if (newScene.trim() && !scenes.includes(newScene.trim())) {
      setScenes([...scenes, newScene.trim()])
      setNewScene('')
    }
  }

  const removeScene = (scene: string) => {
    setScenes(scenes.filter((s) => s !== scene))
  }

  const handleSave = async () => {
    setSaving(true)
    await request(API.activity, {
      action: 'update',
      id: activityId,
      plan_content: planContent,
      scenes,
    })
    setSaving(false)
    router.navigateBack()
  }

  if (!activityId) return null

  if (loading) {
    return <View className="plan-page"><View className="loading">加载中...</View></View>
  }

  return (
    <View className="plan-page">
      {/* AI Prompt 区 */}
      <View className="prompt-card">
        <Text className="card-title">🤖 AI 辅助生成方案</Text>
        <Text className="card-desc">一键复制 Prompt，粘贴到豆包/Kimi 等 AI 工具生成方案</Text>
        <Button className="btn-copy" onClick={copyPrompt}>📋 复制 AI Prompt</Button>
      </View>

      {/* 方案内容 */}
      <View className="form-card">
        <Text className="card-title">📝 方案内容</Text>
        <Textarea
          className="textarea"
          placeholder="粘贴 AI 生成的方案，或直接手动编辑..."
          value={planContent}
          onInput={(e: any) => setPlanContent(e.detail.value)}
          maxlength={5000}
        />
      </View>

      {/* 分段设置 */}
      <View className="form-card">
        <Text className="card-title">📅 活动分段</Text>
        <Text className="card-desc">设置这次活动的分段（如：午餐、下午茶、晚餐）</Text>

        <View className="scenes-row">
          {scenes.map((s) => (
            <View key={s} className="scene-tag">
              <Text>{s}</Text>
              <Text className="remove" onClick={() => removeScene(s)}>×</Text>
            </View>
          ))}
        </View>

        <View className="add-scene">
          <Input
            className="input"
            placeholder="输入分段名称"
            value={newScene}
            onInput={(e: any) => setNewScene(e.detail.value)}
            onConfirm={addScene}
          />
          <Button className="btn-add" onClick={addScene}>添加</Button>
        </View>
      </View>

      <View className="footer">
        <Button className="btn-primary" onClick={handleSave} loading={saving}>
          保存方案
        </Button>
      </View>
    </View>
  )
}
