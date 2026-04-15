import { View, Text } from '@tarojs/components'
import StatusBadge from '../StatusBadge'
import './index.scss'

interface Activity {
  id: string
  title: string
  description?: string
  status: string
  created_at: string
  start_time?: string
}

interface Props {
  activity: Activity
  onClick: () => void
}

export default ({ activity, onClick }: Props) => {
  const getCountdown = () => {
    if (!activity.start_time) return null
    const diff = new Date(activity.start_time).getTime() - Date.now()
    if (diff <= 0) return '已过期'
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    if (days > 0) return `还剩 ${days} 天`
    if (hours > 0) return `还剩 ${hours} 小时`
    return '即将开始'
  }

  const countdown = getCountdown()

  return (
    <View className="activity-card" onClick={onClick}>
      <View className="header">
        <Text className="title">{activity.title}</Text>
        <StatusBadge status={activity.status} />
      </View>
      {countdown && <Text className="countdown">{countdown}</Text>}
      {activity.description && (
        <Text className="desc">{activity.description}</Text>
      )}
    </View>
  )
}
