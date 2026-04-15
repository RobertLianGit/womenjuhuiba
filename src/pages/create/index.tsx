import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import { useState } from 'react'
import { useRouter } from '@tarojs/taro'
import { useUser } from '../../hooks/useUser'
import { request } from '../../utils/api'
import { API } from '../../config'
import { getUUID } from '../../utils/uuid'
import './index.scss'

export default () => {
  const router = useRouter()
  const { user } = useUser()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('请填写活动名称')
      return
    }

    const uuid = getUUID()
    if (!uuid || !user) {
      setError('请先登录')
      return
    }

    setLoading(true)
    setError('')

    const res = await request<{ id: string; token: string }>(API.activity, {
      action: 'create',
      creator_id: uuid,
      title: title.trim(),
      description: description.trim(),
    })

    if (res.success && res.data) {
      router.redirectTo({
        url: `/pages/activity/detail/index?id=${res.data.id}&token=${res.data.token}`,
      })
    } else {
      setError(res.error || '创建失败，请重试')
    }

    setLoading(false)
  }

  return (
    <View className="create-page">
      <View className="form">
        <View className="form-item">
          <View className="label">活动名称 *</View>
          <Input
            className="input"
            placeholder="比如：周末聚餐"
            value={title}
            onInput={(e: any) => setTitle(e.detail.value)}
            maxlength={50}
          />
        </View>

        <View className="form-item">
          <View className="label">活动描述</View>
          <Textarea
            className="textarea"
            placeholder="描述一下这次聚会..."
            value={description}
            onInput={(e: any) => setDescription(e.detail.value)}
            maxlength={500}
          />
        </View>

        {error && <Text className="error">{error}</Text>}

        <Button
          className="btn-primary"
          onClick={handleCreate}
          loading={loading}
          disabled={loading}
        >
          {loading ? '创建中...' : '创建活动'}
        </Button>
      </View>
    </View>
  )
}
