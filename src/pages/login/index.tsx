import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import { useRouter } from '@tarojs/taro'
import { useUser } from '../../hooks/useUser'
import './index.scss'

export default () => {
  const router = useRouter()
  const { user, setDisplayName } = useUser()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 已有用户，直接跳转
  if (user?.display_name) {
    router.redirectTo({ url: '/pages/index/index' })
    return null
  }

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('请输入显示名')
      return
    }
    setLoading(true)
    setError('')
    const ok = await setDisplayName(name.trim())
    if (ok) {
      router.redirectTo({ url: '/pages/index/index' })
    } else {
      setError('设置失败，请重试')
    }
    setLoading(false)
  }

  return (
    <View className="login-page">
      <View className="login-card">
        <View className="logo">🎉</View>
        <View className="title">欢迎来到「开始聚会吧」</View>
        <View className="subtitle">朋友聚会怎么组织、费用怎么算，一站式搞定</View>

        <Input
          className="input"
          placeholder="给自己起个名字（如：小明）"
          value={name}
          onInput={(e: any) => setName(e.detail.value)}
          maxlength={20}
        />
        {error && <Text className="error">{error}</Text>}

        <Button
          className="btn-primary"
          onClick={handleRegister}
          loading={loading}
          disabled={loading}
        >
          {loading ? '设置中...' : '开始使用'}
        </Button>

        <Text className="tip">
          无需注册，我们不会收集你的任何隐私信息
        </Text>
      </View>
    </View>
  )
}
