import { View, Text } from '@tarojs/components'
import './index.scss'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  created: { label: '待开始', color: '#B68C00', bg: '#FFF7CC' },
  intention: { label: '意愿收集中', color: '#D46B08', bg: '#FFF1E6' },
  voting: { label: '投票中', color: '#CF1322', bg: '#FFF1F0' },
  plan_confirmed: { label: '方案已定', color: '#0958D9', bg: '#E6F4FF' },
  registering: { label: '报名中', color: '#389E0D', bg: '#F6FFED' },
  ongoing: { label: '进行中', color: '#722ED1', bg: '#F9F0FF' },
  settled: { label: '已结算', color: '#595959', bg: '#F5F5F5' },
}

interface Props {
  status: string
}

export default ({ status }: Props) => {
  const config = STATUS_MAP[status] || { label: status, color: '#595959', bg: '#F5F5F5' }

  return (
    <View className="status-badge" style={{ color: config.color, background: config.bg }}>
      {config.label}
    </View>
  )
}
