import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import { calculateSplit, calculateOptimalDebts } from '../../../utils/settle'
import './index.scss'

export default () => {
  const [activityId, setActivityId] = useState('')
  const [scenes, setScenes] = useState<Array<{ name: string; amount: string; participants: any[] }>>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [splits, setSplits] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  const [settled, setSettled] = useState(false)
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as any
    const { id } = current.options || {}
    if (id) {
      setActivityId(id)
      loadData(id)
    }
  })

  const loadData = async (id: string) => {
    setLoading(true)

    // 获取报名数据
    const res = await request<any[]>(API.activity, { action: 'get_participants', activity_id: id })
    if (res.success) {
      setParticipants(res.data || [])

      // 初始化每场账单（根据分段）
      const sceneNames = [...new Set(res.data?.map((p: any) => p.scene_name).filter(Boolean) || ['全场'])]
      setScenes(sceneNames.map((name) => ({ name, amount: '', participants: res.data?.filter((p: any) => p.scene_name === name) || [] })))
    }

    // 获取已有结算
    const settleRes = await request<any>(API.settle, { action: 'get', activity_id: id })
    if (settleRes.success && settleRes.data) {
      setSettled(true)
    }

    setLoading(false)
  }

  const compute = () => {
    const sceneData = scenes.map((s) => ({
      scene_name: s.name,
      total_amount: parseFloat(s.amount) || 0,
      participants: s.participants.map((p) => ({
        user_id: p.user_id,
        people_count: p.people_count || 1,
      })),
    }))

    const splitResult = calculateSplit(sceneData)
    setSplits(splitResult)

    // 模拟实付（全部由发起者垫付）
    const payments = splitResult.map((s) => ({ user_id: s.user_id, amount: 0 }))
    const debtResult = calculateOptimalDebts(splitResult, payments)
    setDebts(debtResult)
  }

  const handleSettle = async () => {
    await request(API.settle, {
      action: 'save',
      activity_id: activityId,
      scenes: scenes.map((s) => ({
        scene_name: s.name,
        total_amount: parseFloat(s.amount) || 0,
        participant_ids: s.participants.map((p) => p.user_id),
      })),
    })
    setSettled(true)
  }

  const copyResult = () => {
    let text = '💰 结算结果\n\n'
    for (const s of splits) {
      text += `${s.user_id}: ¥${s.amount.toFixed(2)}\n`
    }
    if (debts.length > 0) {
      text += '\n谁付给谁：\n'
      for (const d of debts) {
        text += `${d.from} → ${d.to}: ¥${d.amount.toFixed(2)}\n`
      }
    }
    navigator.clipboard?.writeText(text)
  }

  if (!activityId) return null

  if (loading) {
    return <View className="settle-page"><View className="loading">加载中...</View></View>
  }

  return (
    <View className="settle-page">
      <View className="title-section">
        <Text className="title">💰 记账结算</Text>
        <Text className="subtitle">发起者填写每场账单，系统自动计算分摊</Text>
      </View>

      {/* 每场账单 */}
      {scenes.map((scene, idx) => (
        <View key={scene.name} className="scene-card">
          <Text className="scene-title">📍 {scene.name}</Text>
          <View className="form-row">
            <Text className="label">账单总额</Text>
            <View className="amount-input">
              <Text>¥</Text>
              <Input
                type="digit"
                placeholder="0.00"
                value={scene.amount}
                onInput={(e: any) => {
                  const newScenes = [...scenes]
                  newScenes[idx].amount = e.detail.value
                  setScenes(newScenes)
                }}
              />
            </View>
          </View>
          <View className="people-info">
            <Text className="people-label">参与人：{scene.participants.length}人</Text>
          </View>
        </View>
      ))}

      {/* 计算按钮 */}
      <Button className="btn-compute" onClick={compute}>🧮 计算分摊</Button>

      {/* 分摊结果 */}
      {splits.length > 0 && (
        <View className="result-section">
          <Text className="section-title">👤 AA 均摊结果</Text>
          {splits.map((s) => (
            <View key={s.user_id} className="split-row">
              <Text className="name">{s.user_id}</Text>
              <Text className="amount">¥{s.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 谁欠谁 */}
      {debts.length > 0 && (
        <View className="result-section">
          <Text className="section-title">🔄 谁欠谁（最优路径）</Text>
          {debts.map((d, i) => (
            <View key={i} className="debt-row">
              <Text>{d.from}</Text>
              <Text className="arrow">→</Text>
              <Text>{d.to}</Text>
              <Text className="amount">¥{d.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 操作 */}
      <View className="footer">
        {splits.length > 0 && (
          <Button className="btn-copy" onClick={copyResult}>📋 复制结算结果</Button>
        )}
        {!settled && splits.length > 0 && (
          <Button className="btn-primary" onClick={handleSettle}>确认结算</Button>
        )}
        {settled && <Text className="settled-tag">✅ 已结算</Text>}
      </View>
    </View>
  )
}
