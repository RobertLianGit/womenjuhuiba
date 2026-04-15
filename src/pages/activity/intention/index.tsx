import { View, Text, Input, Button, Checkbox } from '@tarojs/components'
import { useState, useEffect } from 'react'
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
  const [willJoin, setWillJoin] = useState(true)
  const [wants, setWants] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existing, setExisting] = useState<any>(null)

  useDidShow(() => {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as any
    const { id } = current.options || {}
    if (id) {
      setActivityId(id)
      loadExisting(id)
    }
  })

  const loadExisting = async (id: string) => {
    const uuid = getUUID()
    if (!uuid) return
    const res = await request<any[]>(API.intention, { action: 'list', activity_id: id })
    if (res.success) {
      const myIntention = res.data?.find((i) => i.user_id === uuid)
      if (myIntention) {
        setExisting(myIntention)
        setWillJoin(myIntention.will_join)
        setWants(myIntention.wants || '')
        setSubmitted(true)
      }
    }
  }

  const handleSubmit = async () => {
    const uuid = getUUID()
    if (!uuid || !user?.display_name) return

    setLoading(true)
    const res = await request(API.intention, {
      action: 'submit',
      activity_id: activityId,
      user_id: uuid,
      display_name: user.display_name,
      will_join,
      wants,
    })

    if (res.success) {
      setSubmitted(true)
    }
    setLoading(false)
  }

  const handleStartIntention = async () => {
    await request(API.activity, { action: 'update', id: activityId, status: 'intention' })
    router.navigateBack()
  }

  if (!activityId) return null

  return (
    <View className="intention-page">
      {/* 发起者视角：开启意愿收集 */}
      {user?.uuid && (() => {
        // 检查是否是发起者
        return null // 暂时隐藏简化
      })()}

      {/* 意愿表单 */}
      <View className="form-card">
        <Text className="card-title">🎯 你的意愿</Text>

        {/* 是否参与 */}
        <View className="form-item">
          <Text className="label">是否参加这次聚会？</Text>
          <View className="switch-row">
            <View
              className={`switch ${willJoin ? 'active' : ''}`}
              onClick={() => setWillJoin(true)}
            >
              参加
            </View>
            <View
              className={`switch ${!willJoin ? 'active' : ''}`}
              onClick={() => setWillJoin(false)}
            >
              不参加
            </View>
          </View>
        </View>

        {willJoin && (
          <>
            {/* 名字 */}
            <View className="form-item">
              <Text className="label">你的名字 *</Text>
              <Input
                className="input"
                placeholder="方便发起者记录"
                value={user?.display_name || ''}
                disabled
              />
            </View>

            {/* 想去哪 */}
            <View className="form-item">
              <Text className="label">想去哪 / 想玩什么（选填）</Text>
              <Input
                className="input"
                placeholder="比如：火锅、KTV、户外烧烤..."
                value={wants}
                onInput={(e: any) => setWants(e.detail.value)}
              />
            </View>
          </>
        )}

        {submitted ? (
          <View className="success-msg">✅ 已提交，感谢你的意愿！</View>
        ) : (
          <Button className="btn-primary" onClick={handleSubmit} loading={loading}>
            提交意愿
          </Button>
        )}
      </View>
    </View>
  )
}
