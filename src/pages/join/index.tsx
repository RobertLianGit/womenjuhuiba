import { View, Text, Input, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useRouter, useDidShow } from '@tarojs/taro'
import { request } from '../../utils/api'
import { API } from '../../config'
import { getUUID, saveUUID, generateUUID } from '../../utils/uuid'
import { useUser } from '../../hooks/useUser'
import './index.scss'

type Status = 'loading' | 'setname' | 'joining' | 'success' | 'error'

export default () => {
  const router = useRouter()
  const { user, setDisplayName } = useUser()
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [activityInfo, setActivityInfo] = useState<any>(null)
  const [params, setParams] = useState<{ activityId: string; token: string } | null>(null)

  useDidShow(() => {
    // 解析 URL 参数
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const options = currentPage.options || {}
    const { activityId, token } = options

    if (!activityId || !token) {
      setStatus('error')
      setError('邀请链接不完整')
      return
    }

    setParams({ activityId, token })
    handleJoin(activityId, token)
  })

  const handleJoin = async (activityId: string, token: string) => {
    try {
      // 获取活动信息
      const actRes = await request<any>(API.activity, {
        action: 'get',
        id: activityId,
      })

      if (!actRes.success || !actRes.data) {
        setStatus('error')
        setError('活动不存在或已结束')
        return
      }
      setActivityInfo(actRes.data)

      let uuid = getUUID()

      // 加入活动
      const joinRes = await request<{ role: string }>(API.activity, {
        action: 'join',
        activity_id: activityId,
        token,
        user_id: uuid,
        display_name: user?.display_name || '',
      })

      if (joinRes.success) {
        if (joinRes.message === '已加入') {
          setStatus('success')
          setTimeout(() => {
            router.redirectTo({ url: `/pages/activity/detail/index?id=${activityId}` })
          }, 1500)
        } else if (!user?.display_name) {
          // 需要设置名字
          setStatus('setname')
        } else {
          setStatus('success')
          setTimeout(() => {
            router.redirectTo({ url: `/pages/activity/detail/index?id=${activityId}` })
          }, 1500)
        }
      } else {
        setStatus('error')
        setError(joinRes.error || '加入失败')
      }
    } catch {
      setStatus('error')
      setError('加入失败，请检查链接是否正确')
    }
  }

  const handleConfirm = async () => {
    if (!name.trim()) return

    let uuid = getUUID()
    if (!uuid) {
      uuid = generateUUID()
      saveUUID(uuid)
    }

    // 注册用户
    await setDisplayName(name.trim())

    // 加入活动
    if (params) {
      setStatus('joining')
      const res = await request(API.activity, {
        action: 'join',
        activity_id: params.activityId,
        token: params.token,
        user_id: uuid,
        display_name: name.trim(),
      })

      if (res.success) {
        setStatus('success')
        setTimeout(() => {
          router.redirectTo({ url: `/pages/activity/detail/index?id=${params!.activityId}` })
        }, 1500)
      } else {
        setStatus('error')
        setError(res.error || '加入失败')
      }
    }
  }

  if (status === 'loading') {
    return (
      <View className="join-page">
        <View className="loading-state">
          <Text className="loading-icon">🔍</Text>
          <Text className="loading-text">验证中...</Text>
        </View>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View className="join-page">
        <View className="error-card">
          <Text className="icon">❌</Text>
          <Text className="msg">{error}</Text>
        </View>
      </View>
    )
  }

  if (status === 'success') {
    return (
      <View className="join-page">
        <View className="success-card">
          <Text className="icon">🎉</Text>
          <Text className="msg">加入成功！</Text>
          <Text className="sub">即将跳转到活动...</Text>
        </View>
      </View>
    )
  }

  if (status === 'setname') {
    return (
      <View className="join-page">
        <View className="join-card">
          <Text className="emoji">🤝</Text>
          <Text className="title">你来啦！</Text>
          {activityInfo && (
            <Text className="activity-name">邀请你参加：{activityInfo.title}</Text>
          )}
          <Input
            className="input"
            placeholder="你叫什么名字？"
            value={name}
            onInput={(e: any) => setName(e.detail.value)}
            maxlength={20}
          />
          <Button className="btn-primary" onClick={handleConfirm}>
            加入活动
          </Button>
        </View>
      </View>
    )
  }

  return null
}
