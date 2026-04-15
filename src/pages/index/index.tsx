import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useRouter } from '@tarojs/taro'
import { useUser } from '../../hooks/useUser'
import { request } from '../../utils/api'
import { API } from '../../config'
import { getUUID } from '../../utils/uuid'
import ActivityCard from '../../components/ActivityCard'
import Empty from '../../components/Empty'
import './index.scss'

type Tab = 'created' | 'joined'

export default () => {
  const router = useRouter()
  const { user, loading } = useUser()
  const [tab, setTab] = useState<Tab>('created')
  const [activities, setActivities] = useState<any[]>([])
  const [myActivityIds, setMyActivityIds] = useState<string[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // 未登录跳转登录页
  useEffect(() => {
    if (!loading && (!user || !user.display_name)) {
      router.redirectTo({ url: '/pages/login/index' })
    }
  }, [loading, user])

  // 加载活动数据
  useEffect(() => {
    if (user?.display_name) {
      loadMyActivities()
    }
  }, [tab, user])

  const loadMyActivities = async () => {
    setLoadingList(true)
    const uuid = getUUID()
    if (!uuid) { setLoadingList(false); return }

    // 获取参与者身份对应的活动列表
    const res = await request<any[]>(API.activity, {
      action: 'get_my_activities',
      user_id: uuid,
    })

    if (res.success && res.data) {
      setActivities(res.data)
    }
    setLoadingList(false)
  }

  if (loading || !user?.display_name) {
    return (
      <View className="index-page">
        <View className="loading-center">加载中...</View>
      </View>
    )
  }

  return (
    <View className="index-page">
      {/* 顶部用户信息 */}
      <View className="user-bar">
        <Text className="greeting">你好，{user.display_name}</Text>
      </View>

      {/* Tab 切换 */}
      <View className="tab-bar">
        <View
          className={`tab ${tab === 'created' ? 'active' : ''}`}
          onClick={() => setTab('created')}
        >
          我发起的
        </View>
        <View
          className={`tab ${tab === 'joined' ? 'active' : ''}`}
          onClick={() => setTab('joined')}
        >
          我参与的
        </View>
      </View>

      {/* 活动列表 */}
      <ScrollView className="content" scrollY>
        {loadingList ? (
          <View className="loading-center">加载中...</View>
        ) : activities.length === 0 ? (
          <Empty
            text={tab === 'created' ? '还没发起过活动' : '还没参加过活动'}
            sub={tab === 'created' ? '点击下方按钮创建一个吧' : '让朋友邀请你来参加'}
            emoji={tab === 'created' ? '🎈' : '🤝'}
          />
        ) : (
          activities
            .filter((a) => tab === 'created' ? a.creator_id === user?.uuid : a.creator_id !== user?.uuid)
            .map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                onClick={() => router.navigateTo({ url: `/pages/activity/detail/index?id=${a.id}` })}
              />
            ))
        )}
      </ScrollView>

      {/* 浮动按钮 */}
      <View
        className="fab"
        onClick={() => router.navigateTo({ url: '/pages/create/index' })}
      >
        <Text className="fab-icon">+</Text>
      </View>
    </View>
  )
}
