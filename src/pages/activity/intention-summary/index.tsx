import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import { useUser } from '../../../hooks/useUser'
import Empty from '../../../components/Empty'
import './index.scss'

export default () => {
  const { user } = useUser()
  const [activityId, setActivityId] = useState('')
  const [intentions, setIntentions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as any
    const { id } = current.options || {}
    if (id) {
      setActivityId(id)
      loadIntentions(id)
    }
  })

  const loadIntentions = async (id: string) => {
    setLoading(true)
    const res = await request<any[]>(API.intention, { action: 'list', activity_id: id })
    if (res.success) {
      setIntentions(res.data || [])
    }
    setLoading(false)
  }

  if (!activityId) return null

  const joined = intentions.filter((i) => i.will_join)
  const notJoined = intentions.filter((i) => !i.will_join)

  const wantsList = joined.map((i) => i.wants).filter(Boolean)

  return (
    <View className="summary-page">
      {/* 汇总卡片 */}
      <View className="summary-card">
        <Text className="card-title">📊 意愿汇总</Text>
        <View className="stat-row">
          <View className="stat">
            <Text className="stat-num">{joined.length}</Text>
            <Text className="stat-label">想参加</Text>
          </View>
          <View className="stat">
            <Text className="stat-num">{notJoined.length}</Text>
            <Text className="stat-label">不参加</Text>
          </View>
          <View className="stat">
            <Text className="stat-num">{intentions.length === 0 ? '-' : joined.reduce((sum) => sum + 1, 0)}</Text>
            <Text className="stat-label">总人数</Text>
          </View>
        </View>
      </View>

      {/* 想去哪 */}
      {wantsList.length > 0 && (
        <View className="wants-card">
          <Text className="card-title">📍 想去的地方</Text>
          {wantsList.map((w, i) => (
            <Text key={i} className="want-item">• {w}</Text>
          ))}
        </View>
      )}

      {/* 参与人列表 */}
      <View className="list-card">
        <Text className="card-title">👥 想参加的人</Text>
        {joined.length === 0 ? (
          <Empty text="暂无数据" emoji="🙈" />
        ) : (
          joined.map((i) => (
            <View key={i.id} className="person-item">
              <Text className="person-name">{i.display_name}</Text>
              {i.wants && <Text className="person-want">{i.wants}</Text>}
            </View>
          ))
        )}
      </View>

      {/* 不参加列表 */}
      {notJoined.length > 0 && (
        <View className="list-card">
          <Text className="card-title">🚫 不参加的人</Text>
          {notJoined.map((i) => (
            <View key={i.id} className="person-item absent">
              <Text className="person-name">{i.display_name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
