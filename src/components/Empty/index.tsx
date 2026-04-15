import { View, Text } from '@tarojs/components'
import './index.scss'

interface EmptyProps {
  text?: string
  sub?: string
  emoji?: string
}

export default ({ text = '暂无数据', sub, emoji = '📭' }: EmptyProps) => {
  return (
    <View className="empty">
      <Text className="emoji">{emoji}</Text>
      <Text className="text">{text}</Text>
      {sub && <Text className="sub">{sub}</Text>}
    </View>
  )
}
