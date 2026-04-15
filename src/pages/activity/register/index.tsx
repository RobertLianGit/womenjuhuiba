import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import { useRouter, useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import { getUUID } from '../../../utils/uuid'
import { useUser } from '../../../hooks/useUser'
import './index.scss'

export default () => {
  const router = useRouter()
  const { user } = useUser()
  const [activityId, setActivityId] = useState('')
  const [activity, setActivity] = useState<any>(null)
  const [scenes, setScenes] = useState<string[]>([])
  const [selectedScenes, setSelectedScenes] = useState<string[]>([])
  const [peopleCount, setPeopleCount] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
      setScenes(res.data.scenes || [])
    }
    setLoading(false)
  }

  const toggleScene = (scene: string) => {
    if (selectedScenes.includes(scene)) {
      setSelectedScenes(selectedScenes.filter((s) => s !== scene))
    } else {
      setSelectedScenes([...selectedScenes, scene])
    }
  }

  const handleSubmit = async () => {
    if (scenes.length > 0 && selectedScenes.length === 0) return
    if (!user?.display_name) return

    setSubmitting(true)
    const uuid = getUUID()

    // 报名：写入 participants 表
    for (const scene of scenes.length > 0 ? selectedScenes : ['全场']) {
      await request(API.activity, {
        action: 'register',
        activity_id: activityId,
        user_id: uuid,
        display_name: user.display_name,
        scene_name: scene,
        people_count: peopleCount,
        notes,
      })
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (!activityId) return null

  if (loading) {
    return <View className="register-page"><View className="loading">加载中...</View></View>
  }

  if (submitted) {
    return (
      <View className="register-page">
        <View className="success-card">
          <Text className="icon">✅</Text>
          <Text className="msg">报名成功！</Text>
          <Text className="sub">你已报名参加「{activity?.title}」</Text>
          <Button className="btn-primary" onClick={() => router.navigateBack()}>返回活动</Button>
        </View>
      </View>
    )
  }

  return (
    <View className="register-page">
      <View className="form-card">
        {/* 名字 */}
        <View className="form-item">
          <Text className="label">你的名字</Text>
          <Input className="input" value={user?.display_name || ''} disabled />
        </View>

        {/* 分段选择 */}
        {scenes.length > 0 && (
          <View className="form-item">
            <Text className="label">选择参与哪几段 *</Text>
            <View className="scenes-row">
              {scenes.map((scene) => (
                <View
                  key={scene}
                  className={`scene-btn ${selectedScenes.includes(scene) ? 'selected' : ''}`}
                  onClick={() => toggleScene(scene)}
                >
                  {scene}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 人数 */}
        <View className="form-item">
          <Text className="label">参与人数（含自己）</Text>
          <View className="count-row">
            <Button className="count-btn" onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}>-</Button>
            <Text className="count-num">{peopleCount}</Text>
            <Button className="count-btn" onClick={() => setPeopleCount(peopleCount + 1)}>+</Button>
          </View>
        </View>

        {/* 备注 */}
        <View className="form-item">
          <Text className="label">备注（选填）</Text>
          <Input
            className="input"
            placeholder="如：过敏、忌口..."
            value={notes}
            onInput={(e: any) => setNotes(e.detail.value)}
          />
        </View>

        <Button
          className="btn-primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={scenes.length > 0 && selectedScenes.length === 0}
        >
          提交报名
        </Button>
      </View>
    </View>
  )
}
